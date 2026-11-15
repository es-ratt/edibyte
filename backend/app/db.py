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


# Columns added after the first release: (table, column, SQL type). create_all() never
# alters an existing table, so these are added by hand on startup.
_ADDED_COLUMNS = [("food", "piece_grams", "FLOAT")]


def init_db() -> list[str]:
    """Create tables and add any newer columns. Returns the columns that were added."""
    from sqlalchemy import inspect, text

    from . import models  # noqa: F401  (register tables)

    SQLModel.metadata.create_all(engine)
    added: list[str] = []
    inspector = inspect(engine)
    for table, column, sql_type in _ADDED_COLUMNS:
        existing = {c["name"] for c in inspector.get_columns(table)}
        if column not in existing:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}"))
            added.append(f"{table}.{column}")
    return added


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
