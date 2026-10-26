"""Fuzzy matching of free-text food names to rows in the Food table.

Matching order for a name:
1. exact hit on name_bn / name_en / any alias (also after stripping Bangla or
   Banglish suffixes such as "ভাতের" -> "ভাত");
2. rapidfuzz similarity (ratio / token_sort_ratio) above a threshold;
3. if the name has several words and still no match, split it into the
   longest matching word spans ("bhat dal" -> bhat + dal).
"""

from __future__ import annotations

from dataclasses import dataclass

from rapidfuzz import fuzz, process

from .models import Food
from .text import normalize, stem_variants, strip_punct

# Cooking descriptors that can be ignored when left over after a match.
DESCRIPTOR_WORDS = {
    "fried", "boiled", "bhuna", "jhol", "curry", "sheddho", "siddho", "bhaja", "vaja", "fry",
    "ranna", "plain", "hot", "garam", "gorom", "thanda", "fresh", "homemade", "tarkari",
    "ভুনা", "ঝোল", "রান্না", "গরম", "ঠান্ডা", "দিয়ে", "সাথে", "সহ", "with", "and",
}  # fmt: skip


@dataclass
class Match:
    food: Food
    score: float  # 0..1
    matched_on: str


class FoodIndex:
    """In-memory lookup over all foods. Rebuilt whenever the table changes."""

    def __init__(self, foods: list[Food], threshold: int = 82):
        self.threshold = threshold
        self.foods = {f.id: f for f in foods}
        self.exact: dict[str, str] = {}
        self.choices: list[str] = []
        self.choice_food: list[str] = []
        for f in foods:
            for raw in [f.name_bn, f.name_en, f.id.replace("_", " "), *(f.aliases or [])]:
                key = strip_punct(normalize(raw))
                if not key:
                    continue
                # First writer wins so a specific food keeps its own alias.
                self.exact.setdefault(key, f.id)
                self.choices.append(key)
                self.choice_food.append(f.id)

    def _exact(self, name: str) -> Match | None:
        words = name.split(" ")
        # Try stripping a suffix from the last word: "murgir mangshor" etc.
        candidates = [name]
        candidates += [" ".join([*words[:-1], v]) for v in stem_variants(words[-1])[1:]]
        for c in candidates:
            fid = self.exact.get(c)
            if fid:
                return Match(self.foods[fid], 1.0, c)
        return None

    def _fuzzy(self, name: str) -> Match | None:
        if len(name) < 3 or not self.choices:
            return None
        best = process.extractOne(
            name,
            self.choices,
            scorer=lambda a, b, **_: max(fuzz.ratio(a, b), fuzz.token_sort_ratio(a, b)),
        )
        if best is None:
            return None
        choice, score, idx = best
        if score >= self.threshold:
            return Match(self.foods[self.choice_food[idx]], round(score / 100, 2), choice)
        return None

    def match_one(self, name: str) -> Match | None:
        """Match a whole name to a single food (no splitting)."""
        key = strip_punct(normalize(name))
        if not key:
            return None
        return self._exact(key) or self._fuzzy(key)

    def match_many(self, name: str) -> tuple[list[Match], list[str]]:
        """Match a name that may contain several foods.

        Returns (matches, leftover_unmatched_phrases).
        """
        key = strip_punct(normalize(name))
        if not key:
            return [], []
        whole = self.match_one(key)
        if whole:
            return [whole], []
        words = key.split(" ")
        if len(words) == 1:
            return [], [key]

        matches: list[Match] = []
        leftovers: list[str] = []
        pending: list[str] = []
        i = 0
        while i < len(words):
            found = None
            for span in (3, 2, 1):
                if i + span > len(words):
                    continue
                m = self.match_one(" ".join(words[i : i + span]))
                if m:
                    found = (m, span)
                    break
            if found:
                if pending:
                    leftovers.append(" ".join(pending))
                    pending = []
                matches.append(found[0])
                i += found[1]
            else:
                pending.append(words[i])
                i += 1
        if pending:
            leftovers.append(" ".join(pending))
        # Drop leftovers that are only cooking descriptors when something matched.
        if matches:
            leftovers = [p for p in leftovers if not set(p.split(" ")) <= DESCRIPTOR_WORDS]
        return matches, leftovers

    def suggestions(self, name: str, limit: int = 3) -> list[Food]:
        """Closest foods below the threshold, to help the user fix a row."""
        key = strip_punct(normalize(name))
        if not key or not self.choices:
            return []
        out: list[Food] = []
        for _choice, _score, idx in process.extract(key, self.choices, scorer=fuzz.WRatio, limit=12):
            f = self.foods[self.choice_food[idx]]
            if f not in out:
                out.append(f)
            if len(out) >= limit:
                break
        return out
