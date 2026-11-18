"""POST /meal/check: confirmed foods + answers + profile summary -> ranges, sections, verdict.

Rules under test: numbers only from Food rows and reference_targets.csv; unknown nutrients stay
null ("not in our data yet"); ranges and confidence on every number; limits as share of meal energy
or % of daily limit only when sourced; gentle verdict codes; suggestions respect the diet.
"""

import pytest

from app.check import check_meal, confidence_for
from app.foodgroups import groups_for
from app.schemas import CheckAnswers, CheckItemIn, CheckProfile, CheckRequest
from app.store import foods_by_id

TEEN = CheckProfile(age=15, sex="female", activity="medium", goal="balanced", diet="any")
ADULT = CheckProfile(age=19, sex="male", activity="high", goal="muscle", diet="any")


def run(items, answers=None, profile=TEEN, meal_type="lunch"):
    req = CheckRequest(
        items=[CheckItemIn(**i) for i in items],
        answers=answers or CheckAnswers(),
        profile=profile,
        meal_type=meal_type,
    )
    return check_meal(req)


# --- food groups and confidence -----------------------------------------------------------


def test_food_groups(client):
    f = foods_by_id()
    assert "vegetable" in groups_for(f["shak"])
    assert "protein_food" in groups_for(f["dal"])
    assert "grain" in groups_for(f["bhat"])
    assert "fried" in groups_for(f["beguni"])
    assert "street_food" in groups_for(f["fuchka"])
    # Potatoes are kept out of "vegetable" until a source is chosen (REBUILD_PLAN decision 2).
    assert "protein_food" in groups_for(f["biryani"])  # meat dish without a "protein" tag
    assert "vegetable" not in groups_for(f["alu_vorta"])
    assert "starchy_root" in groups_for(f["alu_vorta"])


def test_confidence_simple_unverified_is_capped_at_medium(client):
    f = foods_by_id()
    level, reasons = confidence_for(f["bhat"], source="text", assumed=False, match_confidence=1.0)
    assert level == "medium" and "unverified_data" in reasons


def test_confidence_street_food_is_low(client):
    level, reasons = confidence_for(foods_by_id()["fuchka"], source="text", assumed=False, match_confidence=1.0)
    assert level == "low" and "dish_varies" in reasons


def test_confidence_drops_for_guessed_match_and_assumed_portion(client):
    f = foods_by_id()
    assert confidence_for(f["bhat"], source="text", assumed=False, match_confidence=0.85)[0] == "low"
    assert confidence_for(f["bhat"], source="photo", assumed=True, match_confidence=1.0)[0] == "low"


# --- numbers: ranges, nulls, sources ---------------------------------------------------------


def test_every_item_has_a_range_and_source(client):
    out = run([{"food_id": "bhat", "quantity": 1, "unit": "plate"}, {"food_id": "dal", "quantity": 1, "unit": "bati"}])
    for item in out.items:
        assert item.grams_low < item.grams < item.grams_high
        assert item.source and item.verified is False
        assert item.confidence in {"high", "medium", "low"}
    e = out.energy
    assert e.low < e.value < e.high


def test_unknown_nutrients_stay_null_not_zero(client):
    out = run([{"food_id": "bhat", "quantity": 1, "unit": "plate"}])
    by = {n.nutrient: n for n in out.go_easy}
    assert by["free_sugars"].value is None and by["free_sugars"].status == "no_data"
    assert by["sodium"].value is None


def test_get_enough_targets_are_pending_for_teens(client):
    out = run([{"food_id": "dal", "quantity": 1, "unit": "bati"}])
    protein = next(n for n in out.get_enough if n.nutrient == "protein")
    assert protein.value is not None and protein.low < protein.value < protein.high
    assert protein.pct_of_target is None and protein.status == "target_pending"


def test_teen_sodium_limit_is_pending_adult_is_sourced(client):
    teen = {n.nutrient: n for n in run([{"food_id": "bhat"}]).go_easy}
    adult = {n.nutrient: n for n in run([{"food_id": "bhat"}], profile=ADULT).go_easy}
    assert teen["sodium"].limit_status == "pending"
    assert adult["sodium"].limit_status == "sourced" and adult["sodium"].limit_value == 2


def test_sugar_spoons_are_an_estimate_not_added_to_energy(client):
    base = run([{"food_id": "rong_cha"}])
    sweet = run([{"food_id": "rong_cha"}], answers=CheckAnswers(sugar_spoons=2))
    assert sweet.added_sugar is not None and sweet.added_sugar.grams == 10.0
    assert sweet.added_sugar.method == "estimate"
    assert sweet.energy.value == base.energy.value


def test_extra_oil_is_noted_and_never_raises_confidence(client):
    normal = run([{"food_id": "shobji"}], answers=CheckAnswers(oil="normal"))
    lots = run([{"food_id": "shobji"}], answers=CheckAnswers(oil="lot"))
    # No sourced oil portion exists, so extra oil is not added to the numbers: it is noted instead.
    assert "extra_oil_not_counted" in lots.notes and "extra_oil_not_counted" not in normal.notes
    assert "extra_oil" in lots.items[0].confidence_reasons
    assert lots.items[0].confidence == "low"  # mixed dish: already the lowest level


def test_piece_count_uses_piece_weight_in_check(client):
    out = run([{"food_id": "fuchka", "quantity": 10, "unit": "piece"}])
    assert out.items[0].grams <= 400 and out.items[0].portion_note == "piece_weight_unknown"


# --- verdict and suggestions ----------------------------------------------------------------


def codes(out):
    return {r.code for r in out.verdict.reasons}


def test_balanced_plate_fits(client):
    out = run([{"food_id": "bhat"}, {"food_id": "dal"}, {"food_id": "shak"}])
    assert out.verdict.level == "fits"
    assert {"has_veg", "has_protein"} <= codes(out)
    assert out.plate == {"grain": True, "protein_food": True, "veg_fruit": True, "dairy": False}


def test_rice_only_lunch_gets_gentle_tips(client):
    out = run([{"food_id": "bhat"}])
    assert out.verdict.level == "mostly"
    assert {"add_veg", "add_protein"} <= codes(out)


def test_fried_street_snack_with_sweet_tea(client):
    out = run([{"food_id": "singara", "quantity": 2, "unit": "piece"}, {"food_id": "cha"}], meal_type="snack")
    assert "fried" in codes(out) and "sugary_drink" in codes(out)
    assert "add_protein" not in codes(out)  # protein tip only for lunch/dinner or a muscle goal


def test_diet_conflict_means_change(client):
    veg = CheckProfile(age=15, sex="male", activity="low", goal="balanced", diet="vegetarian")
    out = run([{"food_id": "bhat"}, {"food_id": "murgi"}], profile=veg)
    assert out.verdict.level == "change" and "diet_conflict" in codes(out)


def test_add_ons_respect_diet_and_skip_potato(client):
    no_beef = CheckProfile(age=15, sex="male", activity="low", goal="muscle", diet="no_beef")
    out = run([{"food_id": "bhat"}], profile=no_beef)
    f = foods_by_id()
    assert out.add_ons, "missing groups should get add-on ideas"
    for a in out.add_ons:
        assert "beef" not in f[a.food.id].tags
        assert not a.food.id.startswith("alu_")
        assert f[a.food.id].category != "mixed_dish"


def test_fried_item_gets_a_non_fried_swap(client):
    out = run([{"food_id": "dim_bhaji"}])
    assert any(s.from_food.id == "dim_bhaji" and s.to_food.id == "dim_sheddho" for s in out.swaps)


def test_unknown_food_id_is_rejected(client):
    r = client.post("/meal/check", json={"items": [{"food_id": "pizza"}]})
    assert r.status_code == 422


def test_endpoint_round_trip(client):
    r = client.post(
        "/meal/check",
        json={
            "items": [{"food_id": "bhat", "quantity": 1, "unit": "plate", "source": "photo", "match_confidence": 0.95}],
            "answers": {"oil": "little", "fried": "no"},
            "profile": {"age": 15, "sex": "female", "activity": "medium", "goal": "energy", "diet": "any"},
            "meal_type": "lunch",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["teen"] is True
    assert body["verdict"]["level"] in {"fits", "mostly", "change"}
    assert body["sources"] and body["method_note"]


@pytest.mark.parametrize("age", [12, 81])
def test_profile_age_limits(client, age):
    r = client.post("/meal/check", json={"items": [{"food_id": "bhat"}], "profile": {"age": age, "sex": "male", "activity": "low", "goal": "balanced", "diet": "any"}})
    assert r.status_code == 422


def test_vegetable_add_ons_come_before_fruit(client):
    out = run([{"food_id": "bhat"}, {"food_id": "dal"}])
    veg = [a for a in out.add_ons if a.reason == "add_veg"]
    assert veg and "vegetable" in groups_for(foods_by_id()[veg[0].food.id])
