from app.parser import extract_rule_based
from app.text import detect_lang, normalize


def names(items):
    return [(i.name, i.quantity, i.unit) for i in items]


def test_normalize_bangla_digits_and_case():
    assert normalize("  ২টা  RUTI ") == "2টা ruti"
    assert len(normalize("x" * 900)) == 500


def test_bangla_meal():
    items = extract_rule_based("আমি এক প্লেট ভাত, এক বাটি ডাল আর একটা ডিম খেয়েছি")
    assert names(items) == [("ভাত", 1, "plate"), ("ডাল", 1, "bati"), ("ডিম", 1, None)]


def test_banglish_attached_count():
    items = extract_rule_based("2ta ruti ar duita dim")
    assert names(items) == [("ruti", 2, "piece"), ("dim", 2, None)]


def test_english_with_articles():
    items = extract_rule_based("I had a cup of tea and two biscuits")
    assert names(items) == [("tea", 1, "cup"), ("biscuits", 2, None)]


def test_postfix_quantity_and_grams():
    items = extract_rule_based("ruti 2ta, 250g doi")
    assert names(items) == [("ruti", 2, "piece"), ("doi", 250, "g")]


def test_missing_quantity_is_none():
    items = extract_rule_based("bhat dal")
    assert items[0].quantity is None


def test_detect_lang():
    assert detect_lang("ভাত খেয়েছি") == "bn"
    assert detect_lang("ami bhat khailam") == "banglish"
    assert detect_lang("rice and fish") == "en"


def test_detect_lang_more_cases():
    assert detect_lang("bhat er bodole ki khete pari") == "banglish"
    assert detect_lang("kom khoroche protein kothay pabo") == "banglish"
    assert detect_lang("How much protein is in an egg?") == "en"
    assert detect_lang("Is singara a good evening snack?") == "en"
    assert detect_lang("একটা ডিমে কত প্রোটিন?") == "bn"
