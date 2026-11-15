"""Meal parsing pipeline: normalise -> extract -> match -> grams."""

from __future__ import annotations

from . import llm
from .nutrition_config import UNCERTAIN_BELOW
from .parser import RawItem, extract_rule_based, extract_with_llm
from .schemas import Lang, ParsedItem, ParseResponse, UnmatchedItem
from .store import brief, food_index
from .text import normalize
from .units import canonical_unit, piece_weight_unknown, to_grams


def _merge_same_food(items: list[ParsedItem]) -> list[ParsedItem]:
    """One row per food: "laal shak, pui shak, kolmi shak" -> shak x3."""
    merged: dict[str, ParsedItem] = {}
    for it in items:
        prev = merged.get(it.food.id)
        if prev is None:
            merged[it.food.id] = it
            continue
        same_unit = prev.unit == it.unit
        grams = round(prev.grams + it.grams, 1)
        if same_unit:
            # A missing quantity means one serving.
            quantity: float | None = (prev.quantity or 1) + (it.quantity or 1)
            unit = prev.unit
        else:
            quantity, unit = grams, "g"
        names = prev.raw_name if it.raw_name in prev.raw_name.split(", ") else f"{prev.raw_name}, {it.raw_name}"
        confidence = min(prev.confidence, it.confidence)
        merged[it.food.id] = ParsedItem(
            raw_name=names[:200],
            food=prev.food,
            quantity=quantity,
            unit=unit,
            grams=grams,
            assumed=prev.assumed and it.assumed,
            confidence=confidence,
            uncertain=confidence < UNCERTAIN_BELOW,
            portion_note=prev.portion_note or it.portion_note,
        )
    return list(merged.values())


def match_items(raw_items: list[RawItem]) -> tuple[list[ParsedItem], list[UnmatchedItem]]:
    index = food_index()
    items: list[ParsedItem] = []
    unmatched: list[UnmatchedItem] = []
    for raw in raw_items:
        unit = canonical_unit(raw.unit)
        matches, leftovers = index.match_many(raw.name)
        # In a split phrase only ONE food gets the stated amount: the first when the amount
        # was written before the foods, the last when it was written after them.
        owner = len(matches) - 1 if getattr(raw, "amount_after", False) else 0
        for i, m in enumerate(matches):
            qty = raw.quantity if i == owner else None
            u = unit if i == owner else None
            grams, assumed = to_grams(m.food, qty, u)
            items.append(
                ParsedItem(
                    raw_name=m.matched_on if len(matches) > 1 else raw.name,
                    food=brief(m.food),
                    quantity=qty,
                    unit=u,
                    grams=grams,
                    assumed=assumed,
                    confidence=m.score,
                    uncertain=m.score < UNCERTAIN_BELOW,
                    portion_note="piece_weight_unknown" if piece_weight_unknown(m.food, qty, u) else None,
                )
            )
        for phrase in leftovers:
            unmatched.append(
                UnmatchedItem(
                    raw_name=phrase,
                    quantity=raw.quantity if not matches else None,
                    unit=unit if not matches else None,
                    suggestions=[brief(f) for f in index.suggestions(phrase)],
                )
            )
    return _merge_same_food(items), unmatched


async def parse_meal(text: str, lang: Lang) -> ParseResponse:
    norm = normalize(text)
    warnings: list[str] = []
    mode = "offline"
    raw_items: list[RawItem] = []
    if llm.is_enabled():
        try:
            raw_items = await extract_with_llm(norm)
            mode = "ai"
        except llm.LLMUnavailable:
            warnings.append("ai_unavailable_used_offline_parser")
    if mode == "offline":
        raw_items = extract_rule_based(norm)
    items, unmatched = match_items(raw_items)
    if not items and not unmatched:
        warnings.append("no_food_found")
    return ParseResponse(
        items=items, unmatched=unmatched, normalized_text=norm, lang=lang, mode=mode, warnings=warnings
    )
