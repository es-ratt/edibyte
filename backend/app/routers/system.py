"""Health, foods, demo profiles, data status, eval results and data deletion."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from rapidfuzz import fuzz, process
from sqlmodel import Session, delete

from ..config import EVAL_DIR, get_settings
from ..db import get_session
from ..models import MealLog
from ..profiles import DEMO_PROFILES
from ..rules import compute_targets
from ..schemas import DemoProfile, FoodOut, Profile, Targets
from ..store import all_foods, all_tips, food_index
from ..text import normalize

router = APIRouter()


@router.get("/health", tags=["system"])
async def health() -> dict:
    s = get_settings()
    return {
        "status": "ok",
        "mode": s.mode,
        "provider": s.llm_provider if s.ai_enabled else "none",
        "photo_enabled": s.enable_photo and s.ai_enabled,
        "foods": len(all_foods()),
    }


@router.get("/foods", response_model=list[FoodOut], tags=["foods"])
async def foods(query: str | None = Query(None, max_length=80), limit: int = Query(20, ge=1, le=100)):
    rows = list(all_foods())
    if not query:
        return [FoodOut.model_validate(f, from_attributes=True) for f in rows[:limit]]
    idx = food_index()
    q = normalize(query)
    # Prefix hits first, then fuzzy hits across all names and aliases.
    seen: list[str] = []
    for key, fid in idx.exact.items():
        if key.startswith(q) and fid not in seen:
            seen.append(fid)
    for _c, score, i in process.extract(q, idx.choices, scorer=fuzz.WRatio, limit=60):
        fid = idx.choice_food[i]
        if score >= 60 and fid not in seen:
            seen.append(fid)
    return [FoodOut.model_validate(idx.foods[fid], from_attributes=True) for fid in seen[:limit]]


@router.get("/profiles/demo", response_model=list[DemoProfile], tags=["profiles"])
async def demo_profiles():
    return DEMO_PROFILES


@router.post("/profiles/targets", response_model=Targets, tags=["profiles"])
async def targets(profile: Profile):
    return compute_targets(profile)


@router.get("/data/status", tags=["data"])
async def data_status() -> dict:
    """Verification status straight from the database (for the /data page)."""
    foods = all_foods()
    tips = all_tips()
    sources: dict[str, int] = {}
    for f in foods:
        sources[f.source] = sources.get(f.source, 0) + 1
    return {
        "foods_total": len(foods),
        "foods_verified": sum(f.verified for f in foods),
        "foods_with_price": sum(f.price_bdt_estimate is not None for f in foods),
        "tips_total": len(tips),
        "tips_verified": sum(t.verified for t in tips),
        "sources": [{"source": k, "rows": v} for k, v in sorted(sources.items(), key=lambda kv: -kv[1])],
        "nutrient_basis": "per 100 g edible portion",
    }


@router.get("/eval/results", tags=["eval"])
async def eval_results() -> dict:
    path = EVAL_DIR / "results.json"
    if not path.exists():
        return {"status": "not_run", "message": "Not run yet"}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="results.json is not valid JSON") from exc
    return {"status": "ok", **data}


@router.delete("/session/data", tags=["privacy"])
async def clear_my_data(
    x_session_id: str = Header(..., max_length=64), session: Session = Depends(get_session)
) -> dict:
    """Delete every meal log stored for this anonymous session id."""
    result = session.exec(delete(MealLog).where(MealLog.session_id == x_session_id))
    session.commit()
    return {"deleted": result.rowcount or 0}
