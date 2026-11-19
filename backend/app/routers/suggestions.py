"""POST /suggestions: habit summary -> one rule-chosen tip from data/tips.csv."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..suggestions import choose_tip

router = APIRouter(tags=["progress"])


class HabitSummary(BaseModel):
    """Counts only: no foods, dates or text leave the device."""

    meals_logged: int = Field(0, ge=0, le=500)
    days_logged: int = Field(0, ge=0, le=7)
    veg_fruit_share: float = Field(0, ge=0, le=1)
    protein_share: float = Field(0, ge=0, le=1)
    sugary_drinks: int = Field(0, ge=0, le=500)
    fried_meals: int = Field(0, ge=0, le=500)
    packaged_snacks: int = Field(0, ge=0, le=500)
    breakfast_share: float = Field(0, ge=0, le=1)


class TipOut(BaseModel):
    id: str
    text_bn: str
    text_en: str
    text_bl: str
    source: str
    source_url: str | None
    reviewed: bool


class SuggestionOut(BaseModel):
    tip: TipOut | None
    reason: str | None = None


@router.post("/suggestions", response_model=SuggestionOut, response_model_exclude_none=False)
async def suggestions(summary: HabitSummary) -> SuggestionOut:
    tip = choose_tip(summary.model_dump())
    if tip is None:
        return SuggestionOut(tip=None, reason="not_enough_meals" if summary.meals_logged < 3 else "no_match")
    return SuggestionOut(
        tip=TipOut(id=tip.id, text_bn=tip.text_bn, text_en=tip.text_en, text_bl=tip.text_bl,
                   source=tip.source, source_url=tip.source_url, reviewed=tip.reviewed_by is not None),
    )  # fmt: skip
