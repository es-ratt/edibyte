"""Deployment settings."""

from app.config import Settings


def test_blank_database_url_falls_back_to_sqlite(monkeypatch):
    """A blank DATABASE_URL field on the host used to crash startup (create_engine(''))."""
    monkeypatch.setenv("DATABASE_URL", "  ")
    assert Settings().database_url.startswith("sqlite:///")


def test_database_url_is_used_when_set(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@host/db")
    assert Settings().database_url == "postgresql://u:p@host/db"
