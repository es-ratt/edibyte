"""Provider-agnostic LLM access.

Configured only through env vars (secrets never leave the backend):
    LLM_PROVIDER = gemini | anthropic | openai | none
    LLM_MODEL    = model name for that provider (never hardcoded here)
    LLM_API_KEY  = API key

When no provider/key/model is set the app runs in OFFLINE MODE and callers
use rule-based fallbacks. Any provider error raises `LLMUnavailable`, which
callers also treat as "fall back to offline for this request".
"""

from __future__ import annotations

import base64
import json
import logging
import re
from typing import TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from .config import get_settings

log = logging.getLogger("edibyte.llm")
T = TypeVar("T", bound=BaseModel)


class LLMUnavailable(RuntimeError):
    """Raised when AI mode is off or the provider call failed."""


def is_enabled() -> bool:
    return get_settings().ai_enabled


# --- provider calls ----------------------------------------------------------


async def _call_gemini(system: str, messages: list[dict], json_mode: bool, image: bytes | None, mime: str) -> str:
    s = get_settings()
    contents = []
    for i, m in enumerate(messages):
        parts: list[dict] = [{"text": m["content"]}]
        if image is not None and i == len(messages) - 1:
            parts.insert(0, {"inline_data": {"mime_type": mime, "data": base64.b64encode(image).decode()}})
        contents.append({"role": "model" if m["role"] == "assistant" else "user", "parts": parts})
    body: dict = {"contents": contents, "systemInstruction": {"parts": [{"text": system}]}}
    body["generationConfig"] = {"temperature": 0.3}
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{s.llm_model}:generateContent"
    async with httpx.AsyncClient(timeout=s.llm_timeout_s) as client:
        r = await client.post(url, params={"key": s.llm_api_key}, json=body)
        r.raise_for_status()
        data = r.json()
    return "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])


async def _call_openai(system: str, messages: list[dict], json_mode: bool, image: bytes | None, mime: str) -> str:
    s = get_settings()
    msgs: list[dict] = [{"role": "system", "content": system}]
    for i, m in enumerate(messages):
        if image is not None and i == len(messages) - 1:
            data_uri = f"data:{mime};base64,{base64.b64encode(image).decode()}"
            msgs.append(
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": m["content"]},
                        {"type": "image_url", "image_url": {"url": data_uri}},
                    ],
                }
            )
        else:
            msgs.append({"role": m["role"], "content": m["content"]})
    body: dict = {"model": s.llm_model, "messages": msgs}
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    async with httpx.AsyncClient(timeout=s.llm_timeout_s) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {s.llm_api_key}"},
            json=body,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"] or ""


async def _call_anthropic(system: str, messages: list[dict], json_mode: bool, image: bytes | None, mime: str) -> str:
    # Official SDK, imported lazily so other providers don't need it installed.
    import anthropic

    s = get_settings()
    msgs: list[dict] = []
    for i, m in enumerate(messages):
        if image is not None and i == len(messages) - 1:
            content: list[dict] | str = [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": mime, "data": base64.b64encode(image).decode()},
                },
                {"type": "text", "text": m["content"]},
            ]
        else:
            content = m["content"]
        msgs.append({"role": m["role"], "content": content})
    async with anthropic.AsyncAnthropic(api_key=s.llm_api_key, timeout=s.llm_timeout_s, max_retries=1) as client:
        resp = await client.messages.create(model=s.llm_model, max_tokens=4096, system=system, messages=msgs)
    if resp.stop_reason == "refusal":
        raise LLMUnavailable("model refused")
    return "".join(b.text for b in resp.content if b.type == "text")


_PROVIDERS = {"gemini": _call_gemini, "openai": _call_openai, "anthropic": _call_anthropic}


async def _complete(
    system: str, messages: list[dict], json_mode: bool, image: bytes | None = None, mime: str = "image/jpeg"
) -> str:
    s = get_settings()
    if not s.ai_enabled:
        raise LLMUnavailable("offline mode")
    try:
        return await _PROVIDERS[s.llm_provider](system, messages, json_mode, image, mime)
    except LLMUnavailable:
        raise
    except Exception as exc:  # network, auth, quota, unexpected payload
        # Log only the error type so no user text or key ends up in logs.
        log.warning("llm_call_failed", extra={"provider": s.llm_provider, "error": type(exc).__name__})
        raise LLMUnavailable(type(exc).__name__) from exc


# --- public helpers ----------------------------------------------------------

_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)


def _extract_json(text: str) -> dict:
    """Parse JSON, tolerating ```json fences or prose around the object."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = _JSON_BLOCK.search(text)
        if not m:
            raise
        return json.loads(m.group(0))


async def complete_json(
    system: str, user: str, schema: type[T], image: bytes | None = None, mime: str = "image/jpeg"
) -> T:
    """Ask for JSON and validate it with Pydantic. Retries once on invalid output."""
    messages = [{"role": "user", "content": user}]
    last_error = ""
    for attempt in range(2):
        raw = await _complete(system, messages, json_mode=True, image=image, mime=mime)
        try:
            return schema.model_validate(_extract_json(raw))
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = str(exc)[:300]
            log.info("llm_invalid_json", extra={"attempt": attempt + 1})
            messages = [
                {"role": "user", "content": user},
                {"role": "assistant", "content": raw[:2000]},
                {
                    "role": "user",
                    "content": "That was not valid JSON for the required schema. Error: "
                    f"{last_error}\nReturn ONLY the corrected JSON object.",
                },
            ]
            image = None  # image already seen; keep the retry small
    raise LLMUnavailable(f"invalid JSON after retry: {last_error}")


async def complete_text(system: str, messages: list[dict]) -> str:
    return (await _complete(system, messages, json_mode=False)).strip()
