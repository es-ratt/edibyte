"""Reference targets and limits provider.

Every target ("get enough") and limit ("go easy") comes from data/reference_targets.csv, where each
value carries its source, URL and the date it was checked. Nothing is hard-coded here. Rows without
a value are listed as "unavailable" so the UI can say "target pending expert review" instead of
guessing.

Group format in the CSV: "<age band> <sex>", for example "all any", "13-17 any", "18+ female".
When several rows match a person, the most specific one wins (narrowest age band, then a specific
sex over "any").
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

from .config import DATA_DIR

REFERENCE_CSV = DATA_DIR / "reference_targets.csv"
PENDING_SOURCE = "awaiting dietitian-approved reference"
MAX_AGE = 200

Sex = Literal["female", "male", "unspecified"]
Status = Literal["sourced", "unavailable"]


@dataclass(frozen=True)
class ReferenceRow:
    nutrient: str
    age_min: int
    age_max: int
    sex: str  # "any" | "female" | "male"
    value: float | None
    unit: str
    type: str  # "target" | "limit"
    source: str
    url: str | None
    date: str | None


@dataclass(frozen=True)
class ReferenceItem:
    nutrient: str
    type: str
    value: float | None
    unit: str
    status: Status
    source: str
    url: str | None
    date: str | None
    note: str | None


def _parse_group(group: str) -> tuple[int, int, str]:
    band, _, sex = group.strip().partition(" ")
    sex = sex.strip() or "any"
    if band == "all":
        return 0, MAX_AGE, sex
    if band.endswith("+"):
        return int(band[:-1]), MAX_AGE, sex
    lo, _, hi = band.partition("-")
    return int(lo), int(hi), sex


def _float(text: str) -> float | None:
    text = (text or "").strip()
    return float(text) if text else None


@lru_cache
def load_reference_rows() -> tuple[ReferenceRow, ...]:
    with REFERENCE_CSV.open(encoding="utf-8") as f:
        rows = []
        for r in csv.DictReader(f):
            lo, hi, sex = _parse_group(r["group"])
            rows.append(
                ReferenceRow(
                    nutrient=r["nutrient"].strip(),
                    age_min=lo,
                    age_max=hi,
                    sex=sex,
                    value=_float(r["value"]),
                    unit=r["unit"].strip(),
                    type=r["type"].strip(),
                    source=r["source"].strip(),
                    url=(r["url"] or "").strip() or None,
                    date=(r["date"] or "").strip() or None,
                )
            )
        return tuple(rows)


def _matches(row: ReferenceRow, age: int, sex: Sex) -> bool:
    return row.age_min <= age <= row.age_max and row.sex in {"any", sex}


def _specificity(row: ReferenceRow) -> tuple[int, int]:
    # Narrower age band first, then a specific sex over "any".
    return (row.age_max - row.age_min, 0 if row.sex != "any" else 1)


def targets_for(age: int, sex: Sex) -> list[ReferenceItem]:
    """One item per nutrient that has a row for this age and sex."""
    best: dict[str, ReferenceRow] = {}
    for row in load_reference_rows():
        if not _matches(row, age, sex):
            continue
        current = best.get(row.nutrient)
        if current is None or _specificity(row) < _specificity(current):
            best[row.nutrient] = row
    items = []
    for row in best.values():
        sourced = row.value is not None and row.source != PENDING_SOURCE
        items.append(
            ReferenceItem(
                nutrient=row.nutrient,
                type=row.type,
                value=row.value if sourced else None,
                unit=row.unit,
                status="sourced" if sourced else "unavailable",
                source=row.source,
                url=row.url,
                date=row.date,
                note=None if sourced else "Target pending expert review: no dietitian-approved reference chosen yet.",
            )
        )
    return items
