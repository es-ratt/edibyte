"""Reference targets and limits come only from data/reference_targets.csv, never from code."""

import csv

import pytest

from app.config import DATA_DIR
from app.reference import PENDING_SOURCE, load_reference_rows, targets_for

CSV_PATH = DATA_DIR / "reference_targets.csv"
COLUMNS = ["nutrient", "group", "value", "unit", "type", "source", "url", "date"]


def rows():
    with CSV_PATH.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_csv_has_the_required_columns():
    with CSV_PATH.open(encoding="utf-8") as f:
        assert next(csv.reader(f)) == COLUMNS


def test_every_value_has_a_source_url_and_date():
    for r in rows():
        if r["value"].strip():
            assert r["source"].strip() and r["source"] != PENDING_SOURCE, r
            assert r["url"].startswith("https://"), r
            assert r["date"].strip(), r
            assert r["type"] in {"target", "limit"}, r


def test_pending_rows_have_no_value():
    """Teen energy/protein/micronutrient needs are not chosen yet: no guessed numbers."""
    pending = [r for r in rows() if r["source"] == PENDING_SOURCE]
    assert pending, "teen reference rows must be listed as pending"
    assert all(not r["value"].strip() for r in pending)


def test_teen_gets_who_limits_that_apply_to_children_only():
    out = {i.nutrient: i for i in targets_for(age=15, sex="female")}
    assert out["free_sugars"].status == "sourced" and out["free_sugars"].value == 10
    assert out["free_sugars"].unit == "% of daily energy"
    assert out["saturated_fat"].status == "sourced"
    assert out["trans_fat"].status == "sourced"
    assert out["fruit_veg"].status == "sourced" and out["fruit_veg"].type == "target"
    # WHO: total fat 30% is for adults; adult sodium 2 g does not apply to children.
    assert "total_fat" not in out
    assert out["sodium"].status == "unavailable" and out["sodium"].value is None
    for n in ("energy", "protein", "iron", "zinc", "calcium", "fibre"):
        assert out[n].status == "unavailable" and out[n].value is None


def test_adult_gets_adult_rows():
    out = {i.nutrient: i for i in targets_for(age=19, sex="male")}
    assert out["sodium"].status == "sourced" and out["sodium"].value == 2
    assert out["total_fat"].status == "sourced"


def test_one_row_per_nutrient_most_specific_group_wins():
    nutrients = [i.nutrient for i in targets_for(age=15, sex="male")]
    assert len(nutrients) == len(set(nutrients))


@pytest.mark.parametrize("age", [12, 81])
def test_endpoint_rejects_ages_outside_range(client, age):
    r = client.get("/reference/targets", params={"age": age, "sex": "female"})
    assert r.status_code == 422


def test_endpoint_returns_sourced_and_unavailable(client):
    r = client.get("/reference/targets", params={"age": 15, "sex": "female", "activity": "medium"})
    assert r.status_code == 200
    body = r.json()
    assert body["teen"] is True
    by = {i["nutrient"]: i for i in body["items"]}
    assert by["free_sugars"]["status"] == "sourced"
    assert by["energy"]["status"] == "unavailable"
    assert by["energy"]["note"]


def test_loader_reads_the_file():
    assert len(load_reference_rows()) == len(rows())
