"""Regression tests for the bugs listed in section 4 of the improvement plan.

Each test names the input that used to go wrong and what it produced before the fix.
"""

import asyncio

import pytest
from starlette.requests import Request

from app.coach import answer
from app.meal import parse_meal
from app.middleware import client_ip
from app.parser import extract_rule_based
from app.schemas import CoachRequest
from app.store import foods_by_id
from app.units import to_grams


def parse(client, text):
    r = client.post("/meal/parse", json={"text": text, "lang": "banglish"})
    assert r.status_code == 200
    return r.json()


def by_food(body):
    return {i["food"]["id"]: i for i in body["items"]}


# --- 4a: a piece count must not be multiplied by a plate-sized serving ---------------


def test_piece_count_is_not_multiplied_by_plate_serving(client):
    """'fuchka 10ta' used to return 10 plates = 1500 g."""
    item = by_food(parse(client, "fuchka 10ta"))["fuchka"]
    assert item["grams"] <= 400
    # The seed has no weighed piece weight for fuchka, so the app must say so.
    assert item["food"]["piece_grams"] is None
    assert item["assumed"] is True and item["portion_note"] == "piece_weight_unknown"


def test_piece_grams_used_when_known(client):
    foods = foods_by_id()
    biscuit = foods["biscuit"]  # serving = 4 pieces
    assert to_grams(biscuit, 2, "piece") == (round(2 * biscuit.piece_grams, 1), False)
    # A bare count means pieces when a piece weight is known: "2 biscuits" is not 8 biscuits.
    assert to_grams(biscuit, 2, None)[0] == round(2 * biscuit.piece_grams, 1)
    # Plates and bowls still use the serving weight.
    bhat = foods["bhat"]
    assert to_grams(bhat, 2, "plate") == (2 * bhat.serving_grams, False)
    assert to_grams(bhat, None, None) == (bhat.serving_grams, True)


def test_report_uses_the_same_piece_rule(client):
    r = client.post("/meal/report", json={"items": [{"food_id": "fuchka", "quantity": 10, "unit": "piece"}], "lang": "en"})
    assert r.status_code == 200
    row = r.json()["items"][0]
    assert row["grams"] <= 400 and row["assumed"] is True


def test_piece_grams_column_is_exposed(client):
    foods = {f["id"]: f for f in client.get("/foods?limit=100").json()}
    assert foods["dim_sheddho"]["piece_grams"] == 50
    assert foods["bhat"]["piece_grams"] is None


# --- 4b: amounts attach to the right food and are never dropped ----------------------


def test_amount_after_each_food(client):
    """'bhat 300g dal 200ml' used to give rice no amount, dal 300 g, and drop 200 ml."""
    items = by_food(parse(client, "bhat 300g dal 200ml"))
    assert (items["bhat"]["quantity"], items["bhat"]["unit"], items["bhat"]["grams"]) == (300, "g", 300)
    assert (items["dal"]["quantity"], items["dal"]["unit"], items["dal"]["grams"]) == (200, "ml", 200)


@pytest.mark.parametrize(
    "text,expected",
    [
        ("cha 2 cup biscuit 4ta", [("cha", 2, "cup"), ("biscuit", 4, "piece")]),
        ("egg 2 pieces bread 3 slice", [("egg", 2, "piece"), ("bread", 3, "slice")]),
        ("dim 2ta kola 1ta", [("dim", 2, "piece"), ("kola", 1, "piece")]),
        ("2 plate bhat 1 bati dal", [("bhat", 2, "plate"), ("dal", 1, "bati")]),
        ("ruti 2ta, 250g doi", [("ruti", 2, "piece"), ("doi", 250, "g")]),
        # Regression (found in the Phase 3 live check): a trailing food with no amount used to
        # shift every amount one food to the right (bhat got nothing, dal got 300 g).
        ("bhat 300g dal 200ml begun bhorta", [("bhat", 300, "g"), ("dal", 200, "ml"), ("begun bhorta", None, None)]),
        ("cha 2 cup biscuit 4ta muri", [("cha", 2, "cup"), ("biscuit", 4, "piece"), ("muri", None, None)]),
        # Amount-first style keeps working; "dal salad" is split later by the matcher (dal gets 1 bati).
        ("2 plate bhat 1 bati dal salad", [("bhat", 2, "plate"), ("dal salad", 1, "bati")]),
    ],
)
def test_amount_attachment(text, expected):
    assert [(i.name, i.quantity, i.unit) for i in extract_rule_based(text)] == expected


def test_amount_after_a_two_food_phrase_goes_to_the_last_food(client):
    items = by_food(parse(client, "bhat dal 2 bati"))
    assert items["dal"]["quantity"] == 2 and items["bhat"]["quantity"] is None


# --- negation (found in review): food the user did NOT eat is not logged -------------


@pytest.mark.parametrize(
    "text,eaten",
    [
        ("bhat khai nai, shudhu dal", {"dal"}),
        ("no rice today, only salad", {"salad"}),
        ("without rice, just dal and egg", {"dal", "dim_sheddho"}),
        ("ভাত খাইনি, শুধু ডাল", {"dal"}),
        ("ভাত ছাড়া মুরগি", {"murgi"}),
    ],
)
def test_negated_food_is_not_logged(client, text, eaten):
    body = parse(client, text)
    assert set(by_food(body)) == eaten
    assert body["unmatched"] == []


# --- 4c: wrong fuzzy matches --------------------------------------------------------


def test_begun_bhorta_is_not_beguni(client):
    body = parse(client, "begun bhorta")
    assert "beguni" not in by_food(body)
    assert [u["raw_name"] for u in body["unmatched"]] == ["begun bhorta"]


def test_chicken_burger_is_not_chicken_curry(client):
    body = parse(client, "chicken burger")
    assert body["items"] == []
    assert [u["raw_name"] for u in body["unmatched"]] == ["chicken burger"]
    assert body["unmatched"][0]["suggestions"]  # the user gets options to pick from


def test_longest_exact_alias_wins(client):
    assert set(by_food(parse(client, "begun bhaja"))) == {"begun_bhaja"}
    assert set(by_food(parse(client, "alu vorta"))) == {"alu_vorta"}


def test_guesses_are_flagged_not_sure(client):
    """A match that needed a guess has confidence below 0.9 and uncertain=true."""
    for text, food in [("fried rice", "bhat"), ("panta bhat", "bhat"), ("chicken fry", "murgi")]:
        item = by_food(parse(client, text))[food]
        assert item["confidence"] < 0.9 and item["uncertain"] is True, text
    sure = by_food(parse(client, "ek plate bhat"))["bhat"]
    assert sure["confidence"] >= 0.9 and sure["uncertain"] is False


def test_filler_verb_is_not_a_food(client):
    """'khai' used to fuzzy-match khasi (mutton)."""
    assert "khasir_mangsho" not in by_food(parse(client, "ami bhat khai"))


# --- 4d: repeated foods become one row ----------------------------------------------


def test_repeated_food_is_merged(client):
    body = parse(client, "laal shak, pui shak, kolmi shak")
    assert [i["food"]["id"] for i in body["items"]] == ["shak"]
    shak = body["items"][0]
    assert shak["quantity"] == 3 and shak["grams"] == 3 * shak["food"]["serving_grams"]


def test_merge_with_different_units_keeps_total_grams(client):
    shak = by_food(parse(client, "1 bati shak ar 50g shak"))["shak"]
    assert shak["unit"] == "g" and shak["grams"] == shak["food"]["serving_grams"] + 50


# --- 4e: the offline coach does not show unrelated tips -----------------------------


def ask(question, lang="en"):
    return asyncio.run(answer(CoachRequest(question=question, lang=lang)))


def test_gain_weight_question_gets_no_weight_loss_tip():
    r = ask("how to gain weight cheaply")
    assert "weight_loss_slow" not in [s.id for s in r.sources]
    assert "weight loss" not in r.answer.lower()


def test_unknown_food_says_no_data():
    r = ask("calories in pizza")
    assert r.sources == []
    assert "couldn't find data" in r.answer


def test_relevant_answers_still_work():
    assert "dim_sheddho" in [s.id for s in ask("dim e koto protein?", "banglish").sources]
    assert "budget_protein" in [s.id for s in ask("what is a cheap protein source?").sources]
    assert "weight_loss_slow" in [s.id for s in ask("ওজন কমাতে কী খাব?", "bn").sources]


# --- 4f: X-Forwarded-For is only read behind a trusted proxy ------------------------


def _request(xff):
    headers = [(b"x-forwarded-for", xff.encode())] if xff else []
    return Request({"type": "http", "headers": headers, "client": ("10.0.0.9", 1234), "method": "GET", "path": "/"})


def test_forwarded_header_ignored_by_default():
    assert client_ip(_request("1.2.3.4"), trust_proxy=False) == "10.0.0.9"


def test_forwarded_header_used_when_proxy_trusted():
    assert client_ip(_request("1.2.3.4, 10.0.0.1"), trust_proxy=True) == "1.2.3.4"
    assert client_ip(_request(""), trust_proxy=True) == "10.0.0.9"


def test_spoofed_header_cannot_dodge_the_limit(client, monkeypatch):
    from app import middleware
    from app.config import Settings

    monkeypatch.setattr(middleware, "get_settings", lambda: Settings(rate_limit_per_minute=3, trust_proxy=False))
    codes = [client.get("/profiles/demo", headers={"X-Forwarded-For": f"9.9.9.{i}"}).status_code for i in range(6)]
    assert 429 in codes


# --- database: an older database gains the new column -------------------------------


def test_old_database_gets_piece_grams_column(tmp_path, monkeypatch):
    from sqlalchemy import create_engine, inspect, text

    from app import db

    old = create_engine(f"sqlite:///{tmp_path}/old.db")
    with old.begin() as conn:
        conn.execute(text("CREATE TABLE food (id VARCHAR PRIMARY KEY, name_bn VARCHAR)"))
    monkeypatch.setattr(db, "engine", old)
    added = db.init_db()
    # piece_grams (bug 4a) plus the Phase 3 columns; every one must now exist.
    assert "food.piece_grams" in added
    assert {f"food.{c}" for c in ("dish_type", "free_sugars_g", "sodium_mg", "method", "verified_by")} <= set(added)
    assert {a.split(".")[1] for a in added} <= {c["name"] for c in inspect(old).get_columns("food")}
    assert db.init_db() == []  # second start: nothing to add


def test_parse_meal_direct_call_matches_endpoint():
    res = asyncio.run(parse_meal("fuchka 10ta", "banglish"))
    assert res.items[0].portion_note == "piece_weight_unknown"
