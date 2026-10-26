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


def detect_lang(text: str) -> str:
    """Guess bn / en / banglish from the script and a few common words."""
    t = normalize(text)
    if has_bangla(t):
        return "bn"
    banglish_markers = {
        "ami", "amar", "khailam", "khaisi", "kheyechi", "khelam", "khabo", "khete", "ki", "koto",
        "ektu", "ar", "kemon", "kivabe", "kibhabe", "keno", "bhalo", "valo", "kom", "beshi", "ta",
        "ekta", "duita", "dui", "plate", "bati", "diye", "shathe", "sathe", "hobe", "kore", "korbo",
    }  # fmt: skip
    words = set(tokenize(t))
    # "plate" alone is English too, so require a second marker in that case.
    hits = words & banglish_markers
    if hits == {"plate"}:
        return "en"
    return "banglish" if hits else "en"
