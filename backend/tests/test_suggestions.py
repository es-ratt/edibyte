"""Weekly suggestion: chosen by rules from data/tips.csv, never by AI."""

import json

import pytest

from app.config import EVAL_DIR
from app.suggestions import MIN_MEALS, choose_tip, load_tips, parse_trigger

CASES = json.loads((EVAL_DIR / "suggestion_cases.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_shared_cases(case):
    tip = choose_tip(case["summary"])
    assert (tip.id if tip else None) == case["expected"]


def test_every_tip_has_three_languages_a_source_and_a_valid_trigger():
    for t in load_tips():
        assert t.text_bn and t.text_en and t.text_bl
        assert t.source
        parse_trigger(t.trigger)


def test_unreviewed_tips_are_labelled():
    assert all(t.reviewed_by is None for t in load_tips())  # none reviewed yet: the app must say so


def test_bad_trigger_is_rejected():
    with pytest.raises(ValueError):
        parse_trigger("__import__('os') > 1")


def test_endpoint(client):
    body = {"meals_logged": 12, "days_logged": 5, "veg_fruit_share": 0.6, "protein_share": 0.8,
            "sugary_drinks": 3, "fried_meals": 1, "packaged_snacks": 0, "breakfast_share": 1}  # fmt: skip
    r = client.post("/suggestions", json=body)
    assert r.status_code == 200
    out = r.json()
    assert out["tip"]["id"] == "sugary_high"
    assert out["tip"]["reviewed"] is False and out["tip"]["source_url"].startswith("https://")


def test_endpoint_needs_enough_meals(client):
    r = client.post("/suggestions", json={"meals_logged": MIN_MEALS - 1, "days_logged": 1})
    assert r.status_code == 200 and r.json() == {"tip": None, "reason": "not_enough_meals"}
