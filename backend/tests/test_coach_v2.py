"""Coach v2: meal context, WHO knowledge, gentle guardrails, teen safety, number post-check."""

import asyncio

from app import coach, llm
from app.coach import allowed_numbers, numbers_in, unsupported_numbers
from app.guardrails import check
from app.schemas import CoachContext, CoachRequest


def ask(client, question, **extra):
    r = client.post("/coach", json={"question": question, "lang": "en", **extra})
    assert r.status_code == 200
    return r.json()


# --- guardrails ------------------------------------------------------------------------------


def test_conditions_get_general_guidance_not_a_flat_refusal(client):
    assert check("ami diabetes er jonno ki khabo") == "condition"
    out = ask(client, "What should I eat with high blood pressure?")
    assert out["guardrail"] == "condition"
    assert "doctor" in out["answer"].lower()
    assert "salt" in out["answer"].lower()  # general WHO guidance, not just a refusal
    assert any(s["type"] == "reference" for s in out["sources"])


def test_allergy_says_cannot_verify(client):
    assert check("is fuchka safe for my peanut allergy?") == "allergy"
    out = ask(client, "is fuchka safe for my peanut allergy?")
    assert out["guardrail"] == "allergy" and "can't verify" in out["answer"].lower()


def test_medicine_and_pregnancy_still_redirect(client):
    assert check("which medicine helps me gain weight") == "medical"
    assert check("I am pregnant, what to eat?") == "pregnancy"


def test_teen_weight_loss_goes_to_a_doctor(client):
    out = ask(client, "how can I lose weight fast", context={"age": 15})
    assert out["guardrail"] == "teen_weight"
    adult = ask(client, "how can I lose weight fast", context={"age": 25})
    assert adult["guardrail"] != "teen_weight"


# --- knowledge and meal context --------------------------------------------------------------


def test_who_facts_are_retrieved_with_a_citation(client):
    out = ask(client, "how much free sugar is okay per day?")
    refs = [s for s in out["sources"] if s["type"] == "reference"]
    assert refs and refs[0]["id"] == "free_sugars"
    assert "10%" in out["answer"]


def test_meal_context_answers_about_the_confirmed_foods(client):
    out = ask(client, "how much protein is in this meal?", context={"age": 15, "meal_food_ids": ["dal", "bhat"]})
    ids = {s["id"] for s in out["sources"]}
    assert {"dal", "bhat"} <= ids


def test_unknown_question_says_no_data(client):
    out = ask(client, "calories in pizza")
    assert "couldn't find data" in out["answer"].lower()


def test_unknown_meal_food_ids_are_ignored(client):
    out = ask(client, "is this meal ok?", context={"meal_food_ids": ["not_a_food"]})
    assert out["answer"]


# --- number post-check ------------------------------------------------------------------------


def test_number_helpers():
    assert numbers_in("about 6.5 g protein and ৭৮ kcal, 10%") == {6.5, 78.0, 10.0}
    assert unsupported_numbers("6.5 g protein", {6.5}) == set()
    assert unsupported_numbers("12 g protein", {6.5}) == {12.0}


def test_allowed_numbers_come_from_rows():
    allowed = allowed_numbers([{"per_serving": {"kcal": 78, "protein_g": 6.5}}], [{"value": 10}], "")
    assert {78.0, 6.5, 10.0} <= allowed


def test_llm_answer_with_an_invented_number_falls_back_offline(client, monkeypatch):
    async def fake_text(system, messages):
        return "An egg has 25 g of protein."  # 25 is not in the data

    monkeypatch.setattr(llm, "is_enabled", lambda: True)
    monkeypatch.setattr(llm, "complete_text", fake_text)
    out = asyncio.run(coach.answer(CoachRequest(question="How much protein is in an egg?", lang="en")))
    assert out.mode == "offline" and out.checked is False
    assert "25" not in out.answer


def test_llm_answer_with_supported_numbers_is_kept(client, monkeypatch):
    async def fake_text(system, messages):
        return "A boiled egg (50 g) gives about 6.5 g protein."

    monkeypatch.setattr(llm, "is_enabled", lambda: True)
    monkeypatch.setattr(llm, "complete_text", fake_text)
    out = asyncio.run(coach.answer(CoachRequest(question="How much protein is in an egg?", lang="en", context=CoachContext(age=15))))
    assert out.mode == "ai" and out.checked is True


def test_teens_get_no_calories_unless_they_ask(client):
    teen = ask(client, "how much protein is in an egg?", context={"age": 15})
    assert "kcal" not in teen["answer"] and "protein" in teen["answer"]
    asked = ask(client, "how many calories in an egg?", context={"age": 15})
    assert "kcal" in asked["answer"]
    adult = ask(client, "how much protein is in an egg?", context={"age": 25})
    assert "kcal" in adult["answer"]


def test_general_who_question_does_not_list_the_meal(client):
    out = ask(client, "how much free sugar is okay per day?", context={"age": 15, "meal_food_ids": ["dal", "bhat"]})
    assert {s["id"] for s in out["sources"]} == {"free_sugars"}
