"""Cached, read-mostly views of the Food and Tip tables.

The tables are small and change only through the importer, so the fuzzy
index and BM25 index are built once and reused. `refresh()` rebuilds them.
"""

from __future__ import annotations

from functools import lru_cache

from sqlmodel import Session, select

from .config import get_settings
from .db import engine
from .matcher import FoodIndex
from .models import Food, Tip
from .schemas import FoodBrief


@lru_cache
def all_foods() -> tuple[Food, ...]:
    with Session(engine) as s:
        foods = s.exec(select(Food).order_by(Food.id)).all()
        for f in foods:
            s.expunge(f)
        return tuple(foods)


@lru_cache
def all_tips() -> tuple[Tip, ...]:
    with Session(engine) as s:
        tips = s.exec(select(Tip).order_by(Tip.id)).all()
        for t in tips:
            s.expunge(t)
        return tuple(tips)


@lru_cache
def food_index() -> FoodIndex:
    return FoodIndex(list(all_foods()), threshold=get_settings().match_threshold)


def foods_by_id() -> dict[str, Food]:
    return {f.id: f for f in all_foods()}


def refresh() -> None:
    from .retrieval import get_retriever

    for fn in (all_foods, all_tips, food_index, get_retriever):
        fn.cache_clear()


def banglish_name(food: Food) -> str:
    """First alias written in Latin letters, title-cased: 'bhat' -> 'Bhat'."""
    for a in food.aliases or []:
        if a.isascii():
            return a[:1].upper() + a[1:]
    return food.name_en


def brief(food: Food) -> FoodBrief:
    return FoodBrief(
        id=food.id,
        name_bn=food.name_bn,
        name_en=food.name_en,
        name_bl=banglish_name(food),
        category=food.category,
        serving_desc_bn=food.serving_desc_bn,
        serving_desc_en=food.serving_desc_en,
        serving_grams=food.serving_grams,
        verified=food.verified,
    )
