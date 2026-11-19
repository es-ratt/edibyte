"""Anonymous adoption events, wrong-item feedback and the protected impact summary.

Privacy: events are allow-listed names with an optional number (no text), tied only to a random
session id generated on the device. The summary endpoint is off unless IMPACT_KEY is set.
Outcome proxies are habit changes (baseline week vs latest week), not medical claims.
"""

from __future__ import annotations

import hmac
import statistics
from collections import Counter, defaultdict
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Session, select

from ..config import get_settings
from ..db import get_session
from ..models import Event, FeedbackItem
from ..store import foods_by_id

router = APIRouter(tags=["analytics"])

EventName = Literal[
    "first_log", "meal_logged", "report_viewed", "photo_used", "coach_asked", "plan_created",
    "plan_completed", "day3_return", "day7_return", "habit_veg_share", "habit_sugary_drinks",
]  # fmt: skip
SESSION_PATTERN = r"^[A-Za-z0-9-]+$"


class EventIn(BaseModel):
    model_config = ConfigDict(extra="forbid")  # anything else (e.g. text) is refused
    name: EventName
    value: float | None = Field(None, ge=0, le=100_000)
    week: int | None = Field(None, ge=0, le=520)


class EventBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str = Field(min_length=8, max_length=64, pattern=SESSION_PATTERN)
    events: list[EventIn] = Field(min_length=1, max_length=50)


class FeedbackIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str = Field(min_length=8, max_length=64, pattern=SESSION_PATTERN)
    food_ids: list[str] = Field(min_length=1, max_length=20)


@router.post("/events")
async def events(batch: EventBatch, session: Session = Depends(get_session)) -> dict:
    for e in batch.events:
        session.add(Event(session_id=batch.session_id, name=e.name, value=e.value, week=e.week))
    session.commit()
    return {"stored": len(batch.events)}


@router.post("/feedback/item")
async def feedback(body: FeedbackIn, session: Session = Depends(get_session)) -> dict:
    known = foods_by_id()
    if any(fid not in known for fid in body.food_ids):
        raise HTTPException(status_code=422, detail="Unknown food_id")
    for fid in body.food_ids:
        session.add(FeedbackItem(session_id=body.session_id, food_id=fid))
    session.commit()
    return {"stored": len(body.food_ids)}


def _habit_change(rows: list[Event]) -> dict:
    """Per user: earliest reported week (baseline) vs latest week, averaged over users with both."""
    per_user: dict[str, list[Event]] = defaultdict(list)
    for e in rows:
        if e.value is not None and e.week is not None:
            per_user[e.session_id].append(e)
    base: list[float] = []
    latest: list[float] = []
    for evs in per_user.values():
        evs.sort(key=lambda e: e.week or 0)
        if len(evs) >= 2 and evs[-1].week != evs[0].week:
            base.append(evs[0].value or 0)
            latest.append(evs[-1].value or 0)
    if not base:
        return {"users": 0, "baseline": None, "latest": None}
    return {"users": len(base), "baseline": round(statistics.mean(base), 2), "latest": round(statistics.mean(latest), 2)}


def _users_with(rows: list[Event]) -> int:
    return len({e.session_id for e in rows})


@router.get("/impact/summary")
async def impact_summary(x_impact_key: str | None = Header(None), session: Session = Depends(get_session)) -> dict:
    key = get_settings().impact_key
    if not key:
        raise HTTPException(status_code=404, detail="Impact summary is disabled (set IMPACT_KEY).")
    if not x_impact_key or not hmac.compare_digest(x_impact_key, key):
        raise HTTPException(status_code=401, detail="Missing or wrong X-Impact-Key.")
    rows = session.exec(select(Event)).all()
    users = len({e.session_id for e in rows})
    count = Counter(e.name for e in rows)
    by_name: dict[str, list[Event]] = defaultdict(list)
    for e in rows:
        by_name[e.name].append(e)
    times = [e.value for e in by_name["meal_logged"] if e.value is not None]
    wrong = Counter(f.food_id for f in session.exec(select(FeedbackItem)).all())
    day3, day7 = _users_with(by_name["day3_return"]), _users_with(by_name["day7_return"])
    return {
        "users": users,
        "meals_logged": count["meal_logged"],
        "meals_per_user": round(count["meal_logged"] / users, 2) if users else 0,
        "time_to_log_seconds_median": statistics.median(times) if times else None,
        "photo_used": count["photo_used"],
        "coach_asked": count["coach_asked"],
        "reports_viewed": count["report_viewed"],
        "returns": {
            "day3": day3,
            "day7": day7,
            "day3_rate": round(day3 / users, 2) if users else 0,
            "day7_rate": round(day7 / users, 2) if users else 0,
        },
        "plans": {"created": count["plan_created"], "completed": count["plan_completed"]},
        "habit_change": {
            "veg_fruit_share": _habit_change(by_name["habit_veg_share"]),
            "sugary_drinks_per_week": _habit_change(by_name["habit_sugary_drinks"]),
        },
        "wrong_items": [{"food_id": f, "count": c} for f, c in wrong.most_common(20)],
        "note": "Anonymous counts. Habit change compares each user's first and latest reported week; not a medical outcome.",
    }
