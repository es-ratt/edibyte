from app.models import Food
from app.units import to_grams


def test_exact_aliases_across_scripts(index):
    for name in ["ভাত", "bhat", "rice", "vat"]:
        assert index.match_one(name).food.id == "bhat"


def test_bangla_suffix_stripped(index):
    assert index.match_one("ভাতের").food.id == "bhat"


def test_fuzzy_spelling_variant(index):
    m = index.match_one("biriyanni")
    assert m and m.food.id == "biryani" and m.score < 1


def test_split_multi_food_phrase(index):
    matches, leftovers = index.match_many("bhat dal alu vorta")
    assert [m.food.id for m in matches] == ["bhat", "dal", "alu_vorta"]
    assert leftovers == []


def test_unknown_food_left_over(index):
    matches, leftovers = index.match_many("pizza")
    assert matches == [] and leftovers == ["pizza"]


def test_chickpea_not_chicken(index):
    assert index.match_one("chickpea curry").food.id == "chola"


def _food(**kw):
    base = dict(id="x", name_bn="x", name_en="x", category="c", serving_desc_bn="", serving_desc_en="",
                serving_grams=200, kcal=100, protein_g=1, carbs_g=1, fat_g=1, source="test")  # fmt: skip
    base.update(kw)
    return Food(**base)


def test_units_to_grams():
    f = _food()
    assert to_grams(f, None, None) == (200, True)  # default serving, assumed
    assert to_grams(f, 2, "plate") == (400, False)
    assert to_grams(f, 150, "g") == (150, False)
    assert to_grams(f, 1, "tbsp") == (15, False)
    assert to_grams(f, 0.5, "kg") == (500, False)


def test_parse_endpoint_unmatched(client):
    r = client.post("/meal/parse", json={"text": "bhat ar pizza", "lang": "banglish"}).json()
    assert [i["food"]["id"] for i in r["items"]] == ["bhat"]
    assert r["unmatched"][0]["raw_name"] == "pizza"
    assert r["mode"] == "offline"
