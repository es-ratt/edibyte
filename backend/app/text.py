"""Text normalisation and tokenisation for Bangla, English and Banglish.

Used by the meal parser, the fuzzy matcher and the BM25 retriever so all of
them see text in the same canonical form.
"""

from __future__ import annotations

import re
import unicodedata

MAX_INPUT_CHARS = 500

_BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
# Bangla danda and common punctuation become plain separators.
_PUNCT = re.compile(r"[।,;:!?\"“”'‘’()\[\]{}<>/\\|*#…]+")
_SPACES = re.compile(r"\s+")
_BN_CHAR = re.compile(r"[ঀ-৿]")

# Inflection suffixes stripped when looking a word up (longest first).
BN_SUFFIXES = ("গুলো", "গুলি", "দের", "টুকু", "য়ের", "ের", "টা", "টি", "খানা", "কে", "তে", "র", "ে")
BL_SUFFIXES = ("gulo", "guli", "tuku", "ta", "ti", "er", "e", "r")


def normalize(text: str, max_len: int = MAX_INPUT_CHARS) -> str:
    """Canonical form: NFC, Bangla digits -> ASCII, lowercase, single spaces."""
    text = unicodedata.normalize("NFC", text or "")[:max_len]
    text = text.translate(_BN_DIGITS).lower()
    # Zero-width joiners appear in some Bangla keyboards.
    text = text.replace("‌", "").replace("‍", "")
    return _SPACES.sub(" ", text).strip()


def strip_punct(text: str) -> str:
    return _SPACES.sub(" ", _PUNCT.sub(" ", text)).strip()


def has_bangla(text: str) -> bool:
    return bool(_BN_CHAR.search(text))


def stem_variants(word: str) -> list[str]:
    """Return the word plus suffix-stripped variants, e.g. 'ভাতের' -> 'ভাত'."""
    out = [word]
    suffixes = BN_SUFFIXES if has_bangla(word) else BL_SUFFIXES
    min_len = 2 if has_bangla(word) else 3
    for suf in suffixes:
        if word.endswith(suf) and len(word) - len(suf) >= min_len:
            out.append(word[: -len(suf)])
    return out


def tokenize(text: str) -> list[str]:
    """Word tokens with punctuation removed. Keeps Bangla and Latin words."""
    return [t for t in strip_punct(normalize(text, max_len=10_000)).split(" ") if t]


# Banglish (Bangla written in Latin letters). STRONG words are almost never English,
# so one hit is enough. WEAK words (mostly food names) also exist in English or are
# ambiguous, so two hits are needed.
_BL_STRONG = {
    "ami", "amar", "amake", "apni", "apnar", "tumi", "tomar", "tomake", "ki", "kono", "kon", "koto",
    "kothay", "kothai", "keno", "kemon", "kivabe", "kibhabe", "kibabe", "kobe", "kokhon", "kar", "kake",
    "khailam", "khaisi", "khaci", "khacchi", "kheyechi", "kheyechen", "khelam", "khabo", "khete", "khai",
    "khaite", "khaoya", "khawa", "khabar", "khaboi", "bhalo", "valo", "bhal", "kharap", "kom", "komano",
    "komate", "beshi", "bes", "barano", "barate", "ektu", "ekta", "duita", "dui", "tinta", "gulo", "guli",
    "diye", "dile", "shathe", "sathe", "hobe", "hoy", "hoye", "hocche", "kore", "korbo", "korte", "korle",
    "korchi", "pabo", "pari", "parbo", "parben", "paren", "pawa", "bodole", "jonno", "niye", "theke",
    "dorkar", "lage", "laglo", "ache", "nei", "nai", "na", "ar", "ebong", "othoba", "kintu", "tai", "tahole",
    "bolo", "bolen", "bolun", "bolte", "jiggesh", "jigges", "shorir", "ojon", "bikel", "dupur", "sokal",
    "nasta", "khushi", "shobar", "shob", "shobcheye", "sobcheye", "ei", "oi", "eta", "ota", "ekhon",
    "ekhane", "ekdom", "onek", "kichu", "kisu", "bhat", "dim", "dal", "mach", "mangsho", "murgi", "shobji",
    "shak", "ruti", "doi", "dudh", "chini", "lobon", "tel", "alu", "begun", "dhaka",
}  # fmt: skip
# Remove food names from STRONG: they are treated as weak below.
_BL_FOODS = {"bhat", "dim", "dal", "mach", "mangsho", "murgi", "shobji", "shak", "ruti", "doi", "dudh",
             "chini", "lobon", "tel", "alu", "begun", "dhaka", "ar", "ei", "kom", "bes", "tai"}  # fmt: skip
_BL_WEAK = _BL_FOODS | {"plate", "bati", "protein", "calorie"}
_BL_STRONG -= _BL_FOODS


def detect_lang(text: str) -> str:
    """Guess bn / en / banglish from the script and common Banglish words.

    Bangla script -> bn. Latin text with Banglish function words -> banglish.
    Anything else -> en. Used by the coach so the answer follows the language
    the user actually typed, not the UI language.
    """
    t = normalize(text)
    if has_bangla(t):
        return "bn"
    words = set(tokenize(t))
    # Bare "plate" / "protein" / "calorie" are English too, so they only count with other hits.
    strong = words & _BL_STRONG
    if strong:
        return "banglish"
    weak = words & (_BL_WEAK - {"plate", "protein", "calorie", "ar", "ei", "kom", "bes", "tai"})
    if len(weak) >= 2:
        return "banglish"
    return "en"
