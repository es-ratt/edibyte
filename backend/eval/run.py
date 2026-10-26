"""Evaluate meal-item matching on the team-made test set.

Usage (from the backend folder):
    python -m eval.run

Runs the real /meal/parse pipeline (AI mode if an LLM key is configured,
otherwise offline mode) on eval/meals_test.jsonl and writes eval/results.json.
Metrics are computed per meal on the SET of matched food ids:
  precision = correct / predicted,  recall = correct / expected,
  exact     = predicted set == expected set.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from sqlmodel import Session

from app.config import EVAL_DIR, get_settings
from app.db import engine, init_db
from app.meal import parse_meal
from app.seed import seed_if_empty
from app.store import refresh

TEST_FILE = EVAL_DIR / "meals_test.jsonl"
RESULTS_FILE = EVAL_DIR / "results.json"


def _load() -> list[dict]:
    with open(TEST_FILE, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def _summary(rows: list[dict]) -> dict:
    tp = sum(r["correct"] for r in rows)
    pred = sum(r["predicted_count"] for r in rows)
    exp = sum(r["expected_count"] for r in rows)
    p = tp / pred if pred else 0.0
    rc = tp / exp if exp else 0.0
    return {
        "meals": len(rows),
        "precision": round(p, 3),
        "recall": round(rc, 3),
        "f1": round(2 * p * rc / (p + rc), 3) if p + rc else 0.0,
        "exact_match_rate": round(sum(r["exact"] for r in rows) / len(rows), 3) if rows else 0.0,
    }


async def run() -> dict:
    init_db()
    with Session(engine) as s:
        seed_if_empty(s)
    refresh()
    cases = _load()
    rows = []
    modes = set()
    for case in cases:
        lang = case["lang"] if case["lang"] in {"bn", "en", "banglish"} else "bn"
        res = await parse_meal(case["text"], lang)
        modes.add(res.mode)
        predicted = {i.food.id for i in res.items}
        expected = set(case["expected"])
        rows.append(
            {
                "id": case["id"],
                "lang": case["lang"],
                "expected": sorted(expected),
                "predicted": sorted(predicted),
                "unmatched": [u.raw_name for u in res.unmatched],
                "correct": len(predicted & expected),
                "predicted_count": len(predicted),
                "expected_count": len(expected),
                "exact": predicted == expected,
            }
        )
    by_lang = {lang: _summary([r for r in rows if r["lang"] == lang]) for lang in sorted({r["lang"] for r in rows})}
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "test_set": "team-made",
        "test_file": "eval/meals_test.jsonl",
        "mode": "ai" if modes == {"ai"} else ("offline" if modes == {"offline"} else "mixed"),
        "provider": get_settings().llm_provider if get_settings().ai_enabled else "none",
        "metric_note": "Item matching on food ids only. Does not measure portion or nutrient accuracy.",
        "overall": _summary(rows),
        "by_lang": by_lang,
        "failures": [r for r in rows if not r["exact"]],
    }


def main() -> None:
    results = asyncio.run(run())
    RESULTS_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    o = results["overall"]
    print(
        f"[{results['mode']}] {o['meals']} team-made meals: precision {o['precision']}, recall {o['recall']}, "
        f"F1 {o['f1']}, exact {o['exact_match_rate']}"
    )
    for f in results["failures"]:
        print(f"  {f['id']} ({f['lang']}): expected {f['expected']} got {f['predicted']} unmatched {f['unmatched']}")
    print(f"Wrote {RESULTS_FILE}")


if __name__ == "__main__":
    main()
