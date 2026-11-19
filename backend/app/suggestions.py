"""Weekly suggestion engine (POST /suggestions).

One tip per week, chosen by RULES from data/tips.csv: the first active tip (lowest priority number)
whose trigger matches the habit summary. An LLM may later reword the chosen tip; it never chooses.
Triggers are tiny data expressions, "metric op number", evaluated without eval().
"""

from __future__ import annotations

import csv
import operator
from dataclasses import dataclass
from functools import lru_cache

from .config import DATA_DIR

TIPS_CSV = DATA_DIR / "tips.csv"
MIN_MEALS = 3  # fewer logged meals than this: no suggestion (not enough to say anything)

METRICS = {
    "meals_logged", "days_logged", "veg_fruit_share", "protein_share", "sugary_drinks",
    "fried_meals", "packaged_snacks", "breakfast_share",
}  # fmt: skip
OPS = {"<": operator.lt, "<=": operator.le, ">": operator.gt, ">=": operator.ge, "==": operator.eq}


@dataclass(frozen=True)
class WeeklyTip:
    id: str
    trigger: str
    priority: int
    text_bn: str
    text_en: str
    text_bl: str
    source: str
    source_url: str | None
    reviewed_by: str | None
    active: bool


def parse_trigger(trigger: str) -> tuple[str, str, float]:
    parts = trigger.split()
    if len(parts) != 3 or parts[0] not in METRICS or parts[1] not in OPS:
        raise ValueError(f"Bad trigger: {trigger!r}")
    return parts[0], parts[1], float(parts[2])


@lru_cache
def load_tips() -> tuple[WeeklyTip, ...]:
    with TIPS_CSV.open(encoding="utf-8") as f:
        tips = [
            WeeklyTip(
                id=r["id"].strip(), trigger=r["trigger"].strip(), priority=int(r["priority"]),
                text_bn=r["text_bn"].strip(), text_en=r["text_en"].strip(), text_bl=r["text_bl"].strip(),
                source=r["source"].strip(), source_url=(r["source_url"] or "").strip() or None,
                reviewed_by=(r["reviewed_by"] or "").strip() or None, active=r["active"].strip().lower() == "true",
            )
            for r in csv.DictReader(f)
        ]
    for t in tips:
        parse_trigger(t.trigger)  # fail fast on a bad file
    return tuple(sorted(tips, key=lambda t: (t.priority, t.id)))


def choose_tip(summary: dict[str, float]) -> WeeklyTip | None:
    if summary.get("meals_logged", 0) < MIN_MEALS:
        return None
    for tip in load_tips():
        if not tip.active:
            continue
        metric, op, value = parse_trigger(tip.trigger)
        if metric in summary and OPS[op](float(summary[metric]), value):
            return tip
    return None
