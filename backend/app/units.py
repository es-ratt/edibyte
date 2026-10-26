"""Quantity words, unit words and gram conversion."""

from __future__ import annotations

from .models import Food
from .nutrition_config import FIXED_UNIT_GRAMS, SERVING_UNITS

# Raw word (bn / en / banglish) -> canonical unit.
UNIT_WORDS: dict[str, str] = {
    # grams and volume
    "g": "g", "gm": "g", "gms": "g", "gram": "g", "grams": "g", "gram er": "g", "গ্রাম": "g",
    "kg": "kg", "kilo": "kg", "কেজি": "kg",
    "ml": "ml", "মিলি": "ml", "l": "l", "liter": "l", "litre": "l", "লিটার": "l",
    # spoons
    "spoon": "tbsp", "spoons": "tbsp", "chamoch": "tbsp", "chamuch": "tbsp", "চামচ": "tbsp",
    "tbsp": "tbsp", "tablespoon": "tbsp", "tsp": "tsp", "teaspoon": "tsp",
    # container / count units (one standard serving each)
    "plate": "plate", "plates": "plate", "thala": "plate", "প্লেট": "plate", "থালা": "plate",
    "bati": "bati", "bowl": "bati", "bowls": "bati", "বাটি": "bati",
    "cup": "cup", "cups": "cup", "kap": "cup", "কাপ": "cup",
    "glass": "glass", "glasses": "glass", "gelash": "glass", "গ্লাস": "glass",
    "piece": "piece", "pieces": "piece", "pc": "piece", "pcs": "piece", "ta": "piece", "ti": "piece",
    "tukra": "piece", "tukro": "piece", "টুকরা": "piece", "টুকরো": "piece", "টা": "piece", "টি": "piece",
    "pis": "piece", "pice": "piece",
    "slice": "slice", "slices": "slice", "sliced": "slice", "স্লাইস": "slice",
    "handful": "handful", "mutho": "handful", "মুঠো": "handful",
    "serving": "serving", "servings": "serving", "portion": "serving",
    "pack": "serving", "packet": "serving", "প্যাকেট": "serving",
}  # fmt: skip

# Number words -> value. Includes "half", "dedh" (1.5) and "arai" (2.5).
NUMBER_WORDS: dict[str, float] = {
    "ek": 1, "ekta": 1, "akta": 1, "ekti": 1, "one": 1, "a": 1, "an": 1, "এক": 1, "একটা": 1, "একটি": 1,
    "dui": 2, "duita": 2, "duiti": 2, "two": 2, "দুই": 2, "দুইটা": 2, "দুটো": 2, "দুটি": 2, "২টা": 2,
    "tin": 3, "tinta": 3, "three": 3, "তিন": 3, "তিনটা": 3, "তিনটি": 3,
    "char": 4, "charta": 4, "four": 4, "চার": 4, "চারটা": 4, "চারটি": 4,
    "panch": 5, "pachta": 5, "five": 5, "পাঁচ": 5, "পাঁচটা": 5, "পাঁচটি": 5,
    "half": 0.5, "adha": 0.5, "ardhek": 0.5, "ordhek": 0.5, "আধা": 0.5, "অর্ধেক": 0.5,
    "dedh": 1.5, "der": 1.5, "দেড়": 1.5, "arai": 2.5, "আড়াই": 2.5,
}  # fmt: skip

# "a" / "an" only count as numbers in English; elsewhere they are skipped.
WEAK_NUMBER_WORDS = {"a", "an"}

KNOWN_UNITS = sorted(set(UNIT_WORDS.values()))


def canonical_unit(word: str | None) -> str | None:
    if not word:
        return None
    w = word.strip().lower()
    if w in KNOWN_UNITS:
        return w
    return UNIT_WORDS.get(w)


def to_grams(food: Food, quantity: float | None, unit: str | None) -> tuple[float, bool]:
    """Convert a quantity to grams for a specific food.

    Returns (grams, assumed). `assumed` is True when the quantity was missing
    and one default serving was used.
    """
    assumed = quantity is None
    qty = 1.0 if quantity is None else max(0.0, float(quantity))
    unit = canonical_unit(unit) or "serving"
    if unit in FIXED_UNIT_GRAMS:
        grams = qty * FIXED_UNIT_GRAMS[unit]
    else:
        # plate / bati / cup / piece / ta ... -> standard servings of this food
        if unit not in SERVING_UNITS:
            unit = "serving"
        grams = qty * food.serving_grams
    return round(grams, 1), assumed
