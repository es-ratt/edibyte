from app import nutrition_config as C
from app.guardrails import check
from app.rules import compute_targets, item_nutrients
from app.schemas import Profile
from app.store import foods_by_id


def test_mifflin_st_jeor_male():
    p = Profile(goal="maintain", sex="male", age=30, height_cm=175, weight_kg=70, activity="sedentary")
    t = compute_targets(p)
    bmr = 10 * 70 + 6.25 * 175 - 5 * 30 + 5  # 1648.75
    assert t.bmr == round(bmr)
    assert t.kcal == round(bmr * 1.2)
    assert t.protein_g == 70


def test_calorie_floor_enforced():
    p = Profile(goal="lose", sex="female", age=80, height_cm=120, weight_kg=30, activity="sedentary")
    t = compute_targets(p)
    assert t.floor_applied is True
    assert t.kcal == C.MIN_KCAL_FLOOR["female"]


def test_macros_add_up_to_calories():
    t = compute_targets(Profile(goal="gain_muscle", sex="male", weight_kg=68, activity="active"))
    energy = t.protein_g * 4 + t.carbs_g * 4 + t.fat_g * 9
    assert abs(energy - t.kcal) < 15


def test_item_nutrients_from_db(client):
    rice = foods_by_id()["bhat"]
    n = item_nutrients(rice, 250)
    assert n.kcal == round(rice.kcal * 2.5)


def test_report_uses_db_and_profile_changes_targets(client):
    items = [{"food_id": "bhat", "quantity": 1, "unit": "plate"}, {"food_id": "singara", "quantity": 2}]
    demos = client.get("/profiles/demo").json()
    reports = [client.post("/meal/report", json={"items": items, "profile": d["profile"], "lang": "en"}).json()
               for d in demos]  # fmt: skip
    assert reports[0]["totals"] == reports[1]["totals"]
    assert reports[0]["targets"]["kcal"] != reports[1]["targets"]["kcal"]
    assert [t["id"] for t in reports[0]["tips"]] != [t["id"] for t in reports[1]["tips"]]
    assert reports[0]["has_unverified"] is True
    assert reports[0]["swaps"] == [] and reports[0]["swaps_note"] == "no_price_data"


def test_report_unknown_food(client):
    r = client.post("/meal/report", json={"items": [{"food_id": "nope"}]})
    assert r.status_code == 422


def test_guardrails():
    assert check("I am pregnant, what to eat?") == "pregnancy"
    assert check("ami diabetes er jonno ki khabo") == "medical"
    assert check("I want a 600 calorie per day diet") == "eating_disorder"
    assert check("dim e koto protein?") is None
    assert check("আমি রোগা, ওজন বাড়াতে চাই") is None


def test_coach_offline_has_sources_and_disclaimer(client):
    r = client.post("/coach", json={"question": "dim e koto protein?", "lang": "banglish"}).json()
    assert r["mode"] == "offline"
    assert r["sources"][0]["id"] == "dim_sheddho"
    assert r["answer"].endswith("medical advice na.")


def test_health(client):
    assert client.get("/health").json()["mode"] == "offline"


def test_swaps_only_with_sourced_prices(monkeypatch):
    from app import rules
    from app.models import Food

    def food(fid, price, protein, tags=()):
        return Food(id=fid, name_bn=fid, name_en=fid, category="fish", serving_desc_bn="", serving_desc_en="",
                    serving_grams=100, kcal=100, protein_g=protein, carbs_g=0, fat_g=1, source="test",
                    price_bdt_estimate=price, price_source="test market list" if price else None,
                    price_date="2026-01-01", tags=list(tags))  # fmt: skip

    ilish, pangash = food("ilish", 120, 18, ["fish"]), food("pangash", 40, 15, ["fish"])
    monkeypatch.setattr(rules, "foods_by_id", lambda: {"ilish": ilish, "pangash": pangash})
    swaps, note = rules.find_swaps([ilish], Profile())
    assert note is None and swaps[0].to_food.id == "pangash" and swaps[0].saving_bdt == 80

    # Vegetarian profiles never get a fish swap.
    swaps, note = rules.find_swaps([ilish], Profile(diet="vegetarian"))
    assert swaps == [] and note == "no_cheaper_option"


def test_coach_answers_in_the_language_typed(client):
    # UI language says "en", but the user typed Bangla / Banglish: the answer follows the typed text.
    bn = client.post("/coach", json={"question": "একটা ডিমে কত প্রোটিন?", "lang": "en"}).json()
    assert bn["lang"] == "bn" and bn["answer"].endswith("চিকিৎসা পরামর্শ নয়।")
    bl = client.post("/coach", json={"question": "ekta dim e koto protein?", "lang": "bn"}).json()
    assert bl["lang"] == "banglish" and bl["answer"].endswith("medical advice na.")
    en = client.post("/coach", json={"question": "How much protein is in an egg?", "lang": "bn"}).json()
    assert en["lang"] == "en" and en["answer"].endswith("not medical advice.")


def test_coach_greeting_is_friendly(client):
    r = client.post("/coach", json={"question": "Hi", "lang": "en"}).json()
    assert "EdiByte coach" in r["answer"] and r["sources"] == []
    r = client.post("/coach", json={"question": "hello", "lang": "bn"}).json()
    assert "Couldn't find" not in r["answer"] and "couldn't find" not in r["answer"]
