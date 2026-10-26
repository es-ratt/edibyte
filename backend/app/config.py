"""Runtime settings read from environment variables.

Everything deployment-specific (database, LLM provider, CORS, feature flags)
lives here so the rest of the code never touches os.environ directly.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
EVAL_DIR = BACKEND_DIR / "eval"

load_dotenv(BACKEND_DIR / ".env")


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    database_url: str = field(
        default_factory=lambda: os.getenv("DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'edibyte.db'}")
    )
    # gemini | anthropic | openai | none
    llm_provider: str = field(default_factory=lambda: os.getenv("LLM_PROVIDER", "none").strip().lower())
    llm_model: str = field(default_factory=lambda: os.getenv("LLM_MODEL", "").strip())
    llm_api_key: str = field(default_factory=lambda: os.getenv("LLM_API_KEY", "").strip())
    llm_timeout_s: int = field(default_factory=lambda: _int("LLM_TIMEOUT_S", 25))
    cors_origins: list[str] = field(
        default_factory=lambda: [
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
            if o.strip()
        ]
    )
    enable_photo: bool = field(default_factory=lambda: _bool("ENABLE_PHOTO", False))
    rate_limit_per_minute: int = field(default_factory=lambda: _int("RATE_LIMIT_PER_MINUTE", 60))
    coach_rate_limit_per_minute: int = field(default_factory=lambda: _int("COACH_RATE_LIMIT_PER_MINUTE", 15))
    # Off by default: logs never contain what users typed.
    log_user_text: bool = field(default_factory=lambda: _bool("LOG_USER_TEXT", False))
    match_threshold: int = field(default_factory=lambda: _int("MATCH_THRESHOLD", 82))

    @property
    def ai_enabled(self) -> bool:
        return self.llm_provider in {"gemini", "anthropic", "openai"} and bool(self.llm_api_key) and bool(
            self.llm_model
        )

    @property
    def mode(self) -> str:
        return "ai" if self.ai_enabled else "offline"


@lru_cache
def get_settings() -> Settings:
    return Settings()
