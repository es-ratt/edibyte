"""Meal parsing pipeline: normalise -> extract -> match -> grams."""

from __future__ import annotations

from . import llm
from .parser import RawItem, extract_rule_based, extract_with_llm
from .schemas import Lang, ParsedItem, ParseResponse, UnmatchedItem
from .store import brief, food_index
from .text import normalize
from .units import canonical_unit, to_grams


def match_items(raw_items: list[RawItem]) -> tuple[list[ParsedItem], list[UnmatchedItem]]:
    index = food_index()
    items: list[ParsedItem] = []
    unmatched: list[UnmatchedItem] = []
    for raw in raw_items:
        unit = canonical_unit(raw.unit)
        matches, leftovers = index.match_many(raw.name)
        for i, m in enumerate(matches):
            # Only the first food in a split phrase inherits the stated amount.
            qty = raw.quantity if i == 0 else None
            u = unit if i == 0 else None
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
    return items, unmatched


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
