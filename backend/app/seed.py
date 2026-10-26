"""Load foods / tips from CSV into the database.

List columns (aliases, tags) are pipe-separated: "bhat|vat|rice".
Upserts by id, so re-importing a corrected CSV updates rows in place.
"""

from __future__ import annotations

import csv
from pathlib import Path

from sqlmodel import Session, select

from .config import DATA_DIR
from .models import Food, Tip

FOOD_SEED = DATA_DIR / "foods_seed.csv"
TIP_SEED = DATA_DIR / "tips_seed.csv"


def _list(v: str | None) -> list[str]:
    seen: list[str] = []
    for part in (v or "").split("|"):
        part = part.strip()
        if part and part not in seen:
            seen.append(part)
    return seen


def _float(v: str | None) -> float | None:
    v = (v or "").strip()
    return float(v) if v else None


def _str(v: str | None) -> str | None:
    v = (v or "").strip()
    return v or None


def _bool(v: str | None) -> bool:
    return (v or "").strip().lower() in {"true", "1", "yes"}


def food_from_row(row: dict[str, str]) -> Food:
    price = _float(row.get("price_bdt_estimate"))
    if price is not None and not _str(row.get("price_source")):
        # A price without a source is not shown anywhere; drop it.
        price = None
    return Food(
        id=row["id"].strip(),
        name_bn=row["name_bn"].strip(),
        name_en=row["name_en"].strip(),
        aliases=_list(row.get("aliases")),
        category=row["category"].strip(),
        serving_desc_bn=row["serving_desc_bn"].strip(),
        serving_desc_en=row["serving_desc_en"].strip(),
        serving_grams=float(row["serving_grams"]),
        kcal=float(row["kcal"]),
        protein_g=float(row["protein_g"]),
        carbs_g=float(row["carbs_g"]),
        fat_g=float(row["fat_g"]),
        fiber_g=_float(row.get("fiber_g")),
        price_bdt_estimate=price,
        price_date=_str(row.get("price_date")),
        price_source=_str(row.get("price_source")),
        tags=_list(row.get("tags")),
        source=row.get("source", "").strip() or "UNKNOWN",
        source_url=_str(row.get("source_url")),
        verified=_bool(row.get("verified")),
        notes=_str(row.get("notes")),
    )


def tip_from_row(row: dict[str, str]) -> Tip:
    return Tip(
        id=row["id"].strip(),
        text_bn=row["text_bn"].strip(),
        text_en=row["text_en"].strip(),
        text_bl=row["text_bl"].strip(),
        tags=_list(row.get("tags")),
        source=row.get("source", "").strip() or "UNKNOWN",
        source_url=_str(row.get("source_url")),
        verified=_bool(row.get("verified")),
    )


def import_csv(session: Session, path: Path, kind: str = "food") -> int:
    builder = food_from_row if kind == "food" else tip_from_row
    count = 0
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            session.merge(builder(row))
            count += 1
    session.commit()
    return count


def seed_if_empty(session: Session) -> dict[str, int]:
    """Called on startup: seed only when the tables are empty."""
    added = {"foods": 0, "tips": 0}
    if session.exec(select(Food).limit(1)).first() is None:
        added["foods"] = import_csv(session, FOOD_SEED, "food")
    if session.exec(select(Tip).limit(1)).first() is None:
        added["tips"] = import_csv(session, TIP_SEED, "tip")
    return added
