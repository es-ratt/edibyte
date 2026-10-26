"""Database tables (SQLModel).

Nutrient columns on Food (kcal, protein_g, carbs_g, fat_g, fiber_g) are
**per 100 g edible portion**, the convention used by food composition tables.
`serving_grams` is the weight of one typical serving (e.g. 1 plate of rice).
`price_bdt_estimate` is the estimated cost of ONE serving in Taka, only when a
real, dated source exists.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Food(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name_bn: str
    name_en: str
    aliases: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    category: str
    serving_desc_bn: str
    serving_desc_en: str
    serving_grams: float
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float | None = None
    price_bdt_estimate: float | None = None
    price_date: str | None = None
    price_source: str | None = None
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    source: str
    source_url: str | None = None
    verified: bool = False
    notes: str | None = None


class Tip(SQLModel, table=True):
    id: str = Field(primary_key=True)
    text_bn: str
    text_en: str
    text_bl: str
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    source: str
    source_url: str | None = None
    verified: bool = False


class MealLog(SQLModel, table=True):
    """Anonymous meal history. Stores only matched food ids and grams, never
    the text the user typed. Deleted by DELETE /session/data."""

    id: int | None = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=utcnow)
    meal_type: str | None = None
    items: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    total_kcal: float = 0
