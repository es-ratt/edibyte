"""Anonymous events, wrong-item feedback and the protected impact summary."""

import pytest

from app.config import get_settings

SID_A = "anon-session-a"
SID_B = "anon-session-b"


def post(client, sid, events):
    return client.post("/events", json={"session_id": sid, "events": events})


def test_events_accept_only_allowlisted_names_and_no_text(client):
    assert post(client, SID_A, [{"name": "meal_logged", "value": 42}]).status_code == 200
    assert post(client, SID_A, [{"name": "hello"}]).status_code == 422
    assert post(client, SID_A, [{"name": "meal_logged", "text": "bhat dal"}]).status_code == 422  # extra fields refused


def test_feedback_stores_food_ids_only(client):
    r = client.post("/feedback/item", json={"session_id": SID_A, "food_ids": ["dim_bhaji", "beguni"]})
    assert r.status_code == 200 and r.json() == {"stored": 2}
    assert client.post("/feedback/item", json={"session_id": SID_A, "food_ids": ["not a food id!"]}).status_code == 422


def test_impact_summary_is_off_without_a_secret(client, monkeypatch):
    monkeypatch.delenv("IMPACT_KEY", raising=False)
    get_settings.cache_clear()
    assert client.get("/impact/summary").status_code == 404


@pytest.fixture
def impact_key(monkeypatch):
    monkeypatch.setenv("IMPACT_KEY", "test-secret-123")
    get_settings.cache_clear()
    yield "test-secret-123"
    get_settings.cache_clear()


def test_impact_summary_needs_the_right_key(client, impact_key):
    assert client.get("/impact/summary").status_code == 401
    assert client.get("/impact/summary", headers={"X-Impact-Key": "wrong"}).status_code == 401


def test_impact_summary_numbers(client, impact_key):
    post(client, SID_B, [
        {"name": "first_log"}, {"name": "meal_logged", "value": 30}, {"name": "meal_logged", "value": 90},
        {"name": "photo_used"}, {"name": "plan_created"}, {"name": "plan_completed"}, {"name": "day3_return"},
        {"name": "habit_veg_share", "value": 0.2, "week": 0}, {"name": "habit_veg_share", "value": 0.6, "week": 3},
    ])  # fmt: skip
    s = client.get("/impact/summary", headers={"X-Impact-Key": impact_key}).json()
    assert s["users"] >= 2
    assert s["meals_logged"] >= 3
    assert s["time_to_log_seconds_median"] is not None
    assert s["returns"]["day3"] >= 1
    assert s["plans"] == {"created": 1, "completed": 1}
    veg = s["habit_change"]["veg_fruit_share"]
    assert veg["users"] == 1 and veg["baseline"] == 0.2 and veg["latest"] == 0.6
    assert {"food_id": "dim_bhaji", "count": 1} in s["wrong_items"]
