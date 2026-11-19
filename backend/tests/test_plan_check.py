"""POST /meal/plan-check: the same engine checks a planned day before eating."""


def test_plan_check_runs_the_engine_per_slot(client):
    body = {
        "slots": {
            "breakfast": [{"food_id": "ruti", "quantity": 2, "unit": "piece"}, {"food_id": "dim_sheddho"}],
            "lunch": [{"food_id": "bhat"}, {"food_id": "dal"}, {"food_id": "shak"}],
            "snack": [],
            "dinner": [{"food_id": "bhat"}],
        },
        "profile": {"age": 15, "sex": "female", "activity": "medium", "goal": "balanced", "diet": "any"},
    }
    r = client.post("/meal/plan-check", json=body)
    assert r.status_code == 200
    out = r.json()
    assert set(out["slots"]) == {"breakfast", "lunch", "dinner"}  # empty slots are skipped
    assert out["slots"]["lunch"]["verdict"]["level"] == "fits"
    assert out["slots"]["dinner"]["verdict"]["level"] == "mostly"
    assert out["day_plate"] == {"grain": True, "protein_food": True, "veg_fruit": True, "dairy": False}
    assert out["veg_fruit_slots"] == 1


def test_plan_check_rejects_unknown_food_and_empty_plan(client):
    assert client.post("/meal/plan-check", json={"slots": {"lunch": [{"food_id": "pizza"}]}}).status_code == 422
    assert client.post("/meal/plan-check", json={"slots": {"lunch": []}}).status_code == 422
