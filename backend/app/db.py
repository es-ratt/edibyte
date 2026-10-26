"""Database engine and session helpers.

SQLite locally, PostgreSQL (Supabase/Neon) in deployment, chosen by
DATABASE_URL. The data set is small, so a sync engine is used and queries run
quickly inside async endpoints.
"""

from __future__ import annotations

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from .config import get_settings


def _normalise_url(url: str) -> str:
    # Many hosts hand out postgres:// URLs; SQLAlchemy needs postgresql://
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


_url = _normalise_url(get_settings().database_url)
_connect_args = {"check_same_thread": False} if _url.startswith("sqlite") else {}
engine = create_engine(_url, connect_args=_connect_args, pool_pre_ping=True)


def init_db() -> None:
    from . import models  # noqa: F401  (register tables)

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
