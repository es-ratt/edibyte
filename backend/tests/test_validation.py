"""Weighed-meal validation script (synthetic, test-only rows: no real results are claimed)."""

from app.store import foods_by_id
from eval.validate_weighed import validate


def row(meal_id, true_ids, app_ids, app_grams, energy=None, protein=None, sodium=None):
    return {"meal_id": meal_id, "true_food_ids": true_ids, "app_food_ids": app_ids, "app_grams": app_grams,
            "true_energy_kcal": energy, "true_protein_g": protein, "true_sodium_mg": sodium, "true_sugar_g": ""}  # fmt: skip


def test_no_rows_means_not_measured():
    assert validate([])["status"] == "not_measured"


def test_identification_and_errors(client):
    bhat = foods_by_id()["bhat"]
    exact = bhat.kcal * 300 / 100
    out = validate([
        row("m1", "bhat|dal", "bhat|dal", "300|150", energy=None),
        row("m2", "bhat", "bhat", "300", energy=exact),           # perfect energy
        row("m3", "beguni|cha", "beguni", "80", energy=exact),   # missed cha, big energy error
    ])  # fmt: skip
    assert out["meals"] == 3
    assert out["identification"]["recall"] == round(4 / 5, 3)
    assert out["identification"]["precision"] == 1.0
    assert out["compared"]["energy_kcal"] == 2
    assert out["compared"]["sodium_mg"] == 0  # no sodium data in the app yet: not compared, not zero
    failed = {f["meal_id"] for f in out["failures"]}
    assert failed == {"m3"}


def test_template_has_the_expected_columns():
    from pathlib import Path
    header = (Path(__file__).resolve().parents[1] / "eval" / "weighed_meals.csv").read_text(encoding="utf-8").splitlines()[0]
    for col in ("true_food_ids", "true_grams", "app_food_ids", "app_grams", "true_energy_kcal", "truth_source"):
        assert col in header


def test_validation_endpoint_says_not_measured(client):
    body = client.get("/eval/validation").json()
    assert body["status"] in {"not_measured", "ok"}
