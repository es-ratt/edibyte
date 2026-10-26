"""/meal/* endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session

from .. import llm
from ..config import get_settings
from ..db import get_session
from ..meal import match_items, parse_meal
from ..models import MealLog
from ..parser import LLMItems, LLM_SYSTEM
from ..rules import build_report
from ..schemas import Lang, ParseRequest, ParseResponse, ReportRequest, ReportResponse

router = APIRouter(prefix="/meal", tags=["meal"])

MAX_IMAGE_BYTES = 4 * 1024 * 1024


@router.post("/parse", response_model=ParseResponse)
async def parse(req: ParseRequest) -> ParseResponse:
    return await parse_meal(req.text, req.lang)


@router.post("/report", response_model=ReportResponse)
async def report(req: ReportRequest, session: Session = Depends(get_session)) -> ReportResponse:
    try:
        result = build_report(req.items, req.profile, req.lang)
    except KeyError as exc:
        raise HTTPException(status_code=422, detail=f"Unknown food_id: {exc.args[0]}") from exc
    if req.session_id:
        # Store only food ids and grams for the anonymous session.
        session.add(
            MealLog(
                session_id=req.session_id,
                meal_type=req.meal_type,
                items=[{"food_id": i.food.id, "grams": i.grams} for i in result.items],
                total_kcal=result.totals.kcal,
            )
        )
        session.commit()
    return result


@router.post("/parse-image", response_model=ParseResponse)
async def parse_image(image: UploadFile = File(...), lang: Lang = Form("bn")) -> ParseResponse:
    """Feature-flagged (ENABLE_PHOTO). Uses a vision-capable LLM to list foods,
    then the same matching + review flow as text."""
    s = get_settings()
    if not s.enable_photo:
        raise HTTPException(status_code=404, detail="Photo input is disabled (ENABLE_PHOTO=false).")
    if not llm.is_enabled():
        raise HTTPException(status_code=503, detail="Photo input needs AI mode (an LLM key).")
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Use a JPEG, PNG or WebP image.")
    data = await image.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image is larger than 4 MB.")
    try:
        result = await llm.complete_json(
            system=LLM_SYSTEM + "\nThe meal is shown in the attached photo. Name each visible food.",
            user="List the foods in this photo.",
            schema=LLMItems,
            image=data,
            mime=image.content_type,
        )
    except llm.LLMUnavailable as exc:
        raise HTTPException(status_code=503, detail="AI is unavailable right now. Please type your meal.") from exc
    items, unmatched = match_items(result.items)
    return ParseResponse(
        items=items, unmatched=unmatched, normalized_text="", lang=lang, mode="ai", warnings=["from_photo"]
    )
