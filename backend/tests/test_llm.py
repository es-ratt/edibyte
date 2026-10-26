"""LLM path with a fake provider: JSON validation, retry and offline fallback."""

import asyncio

import pytest

from app import llm, meal
from app.parser import LLMItems


def _fake(responses):
    calls = []

    async def fake_complete(system, messages, json_mode, image=None, mime="image/jpeg"):
        calls.append(messages)
        r = responses.pop(0)
        if isinstance(r, Exception):
            raise r
        return r

    return fake_complete, calls


def test_retry_once_on_invalid_json(monkeypatch):
    fake, calls = _fake(["not json", '{"items":[{"name":"bhat","quantity":1,"unit":"plate"}]}'])
    monkeypatch.setattr(llm, "_complete", fake)
    out = asyncio.run(llm.complete_json("s", "u", LLMItems))
    assert out.items[0].name == "bhat" and len(calls) == 2


def test_nutrients_from_llm_are_rejected(monkeypatch):
    bad = '{"items":[{"name":"bhat","quantity":1,"unit":"plate","kcal":999}]}'
    fake, _ = _fake([bad, bad])
    monkeypatch.setattr(llm, "_complete", fake)
    with pytest.raises(llm.LLMUnavailable):
        asyncio.run(llm.complete_json("s", "u", LLMItems))


def test_parse_falls_back_to_offline_when_ai_fails(client, monkeypatch):
    fake, _ = _fake([llm.LLMUnavailable("down")])
    monkeypatch.setattr(llm, "_complete", fake)
    monkeypatch.setattr(llm, "is_enabled", lambda: True)
    res = asyncio.run(meal.parse_meal("bhat ar dal", "banglish"))
    assert res.mode == "offline"
    assert "ai_unavailable_used_offline_parser" in res.warnings
    assert [i.food.id for i in res.items] == ["bhat", "dal"]


def test_ai_parse_uses_db_for_grams(client, monkeypatch):
    fake, _ = _fake(['{"items":[{"name":"ভাত","quantity":2,"unit":"plate"}]}'])
    monkeypatch.setattr(llm, "_complete", fake)
    monkeypatch.setattr(llm, "is_enabled", lambda: True)
    res = asyncio.run(meal.parse_meal("দুই প্লেট ভাত", "bn"))
    assert res.mode == "ai" and res.items[0].grams == 500
