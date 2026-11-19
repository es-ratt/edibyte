"""Weighed-meal validation: compare the app's estimates with kitchen-scale measurements.

How the team uses it (see docs/VALIDATION.md):
1. Weigh each component of a real meal on a kitchen scale BEFORE eating; photograph the plate.
2. Write the truth: food ids and weighed grams. Energy/protein/sodium/sugar truth comes from a cited
   source (food composition table rows or a pack label), written per meal in the CSV.
3. Run the app on the photo (or text) and copy what it identified and the grams it used.
4. Run:  python -m eval.validate_weighed eval/weighed_meals.csv
It writes eval/validation_results.json with identification accuracy, mean absolute error per
nutrient (only where both values exist) and every failure. Nothing is filtered or tuned.
"""

from __future__ import annotations

import csv
import json
import statistics
import sys
from datetime import date
from pathlib import Path

from app.check import check_meal
from app.schemas import CheckItemIn, CheckRequest

EVAL_DIR = Path(__file__).resolve().parent
RESULTS = EVAL_DIR / "validation_results.json"
NUTRIENTS = {"energy_kcal": "energy", "protein_g": "protein", "sodium_mg": "sodium", "sugar_g": "free_sugars"}
FAIL_ERROR_SHARE = 0.30  # a meal counts as a failure when an estimate is more than 30% off


def _ids(cell: str) -> list[str]:
    return [x.strip() for x in (cell or "").split("|") if x.strip()]


def _num(cell: str | float | None) -> float | None:
    if isinstance(cell, (int, float)):
        return float(cell)
    text = (cell or "").strip()
    return float(text) if text else None


def app_estimates(food_ids: list[str], grams: list[float]) -> dict[str, float | None]:
    """The engine's numbers for what the app identified, at the grams it used."""
    items = [CheckItemIn(food_id=f, quantity=g, unit="g") for f, g in zip(food_ids, grams, strict=True)]
    r = check_meal(CheckRequest(items=items))
    lines = {line.nutrient: line.value for line in [*r.get_enough, *r.go_easy]}
    return {"energy": r.energy.value, "protein": lines.get("protein"), "sodium": lines.get("sodium"), "free_sugars": lines.get("free_sugars")}


def validate(rows: list[dict[str, str]]) -> dict:
    if not rows:
        return {"status": "not_measured", "message": "No weighed meals yet.", "date": date.today().isoformat()}
    tp = fp = fn = 0
    errors: dict[str, list[float]] = {k: [] for k in NUTRIENTS}
    rel: dict[str, list[float]] = {k: [] for k in NUTRIENTS}
    failures: list[dict] = []
    for row in rows:
        true_ids, app_ids = set(_ids(row["true_food_ids"])), _ids(row["app_food_ids"])
        tp += len(true_ids & set(app_ids))
        fp += len(set(app_ids) - true_ids)
        fn += len(true_ids - set(app_ids))
        reasons = []
        if set(app_ids) != true_ids:
            reasons.append(f"identification: missed {sorted(true_ids - set(app_ids))}, extra {sorted(set(app_ids) - true_ids)}")
        app_grams = [float(g) for g in _ids(row["app_grams"])]
        est = app_estimates(app_ids, app_grams) if app_ids else {}
        for col, key in NUTRIENTS.items():
            truth, guess = _num(row.get(f"true_{col}")), est.get(key)
            if truth is None or guess is None:
                continue
            errors[col].append(abs(guess - truth))
            if truth > 0:
                share = abs(guess - truth) / truth
                rel[col].append(share)
                if share > FAIL_ERROR_SHARE:
                    reasons.append(f"{col}: app {guess:g} vs weighed {truth:g}")
        if reasons:
            failures.append({"meal_id": row["meal_id"], "reasons": reasons})
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    return {
        "status": "ok",
        "date": date.today().isoformat(),
        "meals": len(rows),
        "identification": {"precision": round(precision, 3), "recall": round(recall, 3),
                           "f1": round(2 * precision * recall / (precision + recall), 3) if precision + recall else 0},
        "mean_absolute_error": {col: (round(statistics.mean(v), 1) if v else None) for col, v in errors.items()},
        "mean_relative_error": {col: (round(statistics.mean(v), 3) if v else None) for col, v in rel.items()},
        "compared": {col: len(v) for col, v in errors.items()},
        "failures": failures,
        "note": "Truth = kitchen-scale grams with cited composition values. Nutrients the app has no data for are not compared (see 'compared').",
    }  # fmt: skip


def main(path: str) -> None:
    from sqlmodel import Session

    from app.db import engine, init_db
    from app.seed import seed_if_empty
    from app.store import refresh

    init_db()
    with Session(engine) as s:
        seed_if_empty(s)
    refresh()
    with open(path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    result = validate(rows)
    RESULTS.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{result['status']}: {result.get('meals', 0)} meals -> {RESULTS}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(EVAL_DIR / "weighed_meals.csv"))
