"""GET /reference/targets: sourced targets and limits for an age and sex, or "unavailable"."""

from __future__ import annotations

from dataclasses import asdict
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..reference import targets_for

router = APIRouter(tags=["reference"])

TEEN_MAX_AGE = 17


class ReferenceItemOut(BaseModel):
    nutrient: str
    type: Literal["target", "limit"]
    value: float | None
    unit: str
    status: Literal["sourced", "unavailable"]
    source: str
    url: str | None
    date: str | None
    note: str | None


class ReferenceTargetsOut(BaseModel):
    age: int
    sex: Literal["female", "male", "unspecified"]
    activity: str | None
    teen: bool
    items: list[ReferenceItemOut]


@router.get("/reference/targets", response_model=ReferenceTargetsOut)
async def reference_targets(
    age: int = Query(ge=13, le=80),
    sex: Literal["female", "male", "unspecified"] = "unspecified",
    activity: Literal["low", "medium", "high"] | None = None,
) -> ReferenceTargetsOut:
    # activity is accepted for the energy target; no sourced energy reference exists yet.
    items = [ReferenceItemOut(**asdict(i)) for i in targets_for(age, sex)]
    return ReferenceTargetsOut(age=age, sex=sex, activity=activity, teen=age <= TEEN_MAX_AGE, items=items)
