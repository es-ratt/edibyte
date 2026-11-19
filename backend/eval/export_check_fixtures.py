"""Export golden fixtures for the web demo engine.

The static demo (no backend) runs a TypeScript port of app/check.py. These fixtures are produced
by the real Python engine; frontend/src/lib/check/parity.test.ts fails if the port gives a different
answer for any of them.

Run from backend/:  python -m eval.export_check_fixtures
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

os.environ.setdefault("DATABASE_URL", f"sqlite:///{tempfile.mkdtemp()}/fixtures.db")
os.environ["LLM_PROVIDER"] = "none"

from sqlmodel import Session

from app.check import check_meal
from app.db import engine, init_db
from app.schemas import CheckRequest
from app.seed import seed_if_empty
from app.store import refresh

OUT = Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "check" / "fixtures.json"

TEEN = {"age": 15, "sex": "female", "activity": "medium", "goal": "balanced", "diet": "any"}
CASES = [
    {"items": [{"food_id": "bhat", "quantity": 1, "unit": "plate"}, {"food_id": "dal", "quantity": 1, "unit": "bati"}, {"food_id": "shak"}], "profile": TEEN, "meal_type": "lunch"},
    {"items": [{"food_id": "bhat"}], "profile": TEEN, "meal_type": "lunch"},
    {"items": [{"food_id": "singara", "quantity": 2, "unit": "piece"}, {"food_id": "cha"}], "answers": {"sugar_spoons": 2}, "profile": TEEN, "meal_type": "snack"},
    {"items": [{"food_id": "fuchka", "quantity": 10, "unit": "piece", "source": "photo", "match_confidence": 0.95}], "answers": {"oil": "lot", "fried": "yes"}, "profile": TEEN},
    {"items": [{"food_id": "bhat"}, {"food_id": "murgi", "quantity": 1, "unit": "bati"}], "profile": {**TEEN, "diet": "vegetarian"}, "meal_type": "dinner"},
    {"items": [{"food_id": "dim_bhaji"}, {"food_id": "paratha", "quantity": 2, "unit": "piece"}], "profile": {"age": 19, "sex": "male", "activity": "high", "goal": "muscle", "diet": "no_beef"}, "meal_type": "breakfast"},
    {"items": [{"food_id": "biryani", "quantity": 1.5, "unit": "plate", "source": "photo", "match_confidence": 0.8}, {"food_id": "dab", "quantity": 300, "unit": "ml"}], "profile": None, "meal_type": "dinner"},
    {"items": [{"food_id": "kola", "quantity": 2}, {"food_id": "doi", "quantity": 1, "unit": "cup"}, {"food_id": "chira", "quantity": 50, "unit": "g"}], "profile": TEEN, "meal_type": "breakfast"},
]


def main() -> None:
    init_db()
    with Session(engine) as s:
        seed_if_empty(s)
    refresh()
    fixtures = []
    for case in CASES:
        req = CheckRequest(**case)
        fixtures.append({"request": json.loads(req.model_dump_json()), "response": json.loads(check_meal(req).model_dump_json())})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(fixtures, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {len(fixtures)} fixtures to {OUT}")


if __name__ == "__main__":
    main()
