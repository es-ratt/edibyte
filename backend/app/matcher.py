"""Fuzzy matching of free-text food names to rows in the Food table.

Matching order for a name:
1. exact hit on name_bn / name_en / any alias (also after stripping Bangla or
   Banglish suffixes such as "ভাতের" -> "ভাত");
2. rapidfuzz similarity (ratio / token_sort_ratio) above a threshold (stricter
   for short words);
3. if the name has several words and still no match, split it: longest EXACT
   alias spans first, then fuzzy on what is left ("bhat dal" -> bhat + dal).
A match that needed a guess gets a score below 0.9 and is shown as "not sure".
"""

from __future__ import annotations

from dataclasses import dataclass

from rapidfuzz import fuzz, process

from .models import Food
from .text import normalize, stem_variants, strip_punct

# Cooking descriptors that can be ignored when left over after a match.
DESCRIPTOR_WORDS = {
    "boiled", "bhuna", "jhol", "curry", "sheddho", "siddho",
    "ranna", "plain", "hot", "garam", "gorom", "thanda", "fresh", "homemade", "tarkari",
    "ভুনা", "ঝোল", "রান্না", "গরম", "ঠান্ডা", "দিয়ে", "সাথে", "সহ", "with", "and",
}  # fmt: skip
# Frying changes the fat and energy a lot. These words are still dropped when a food matched,
# but the match is then marked as a guess ("fried rice" is not plain rice).
METHOD_WORDS = {"fried", "fry", "bhaja", "vaja", "bhaji", "vaji", "ভাজা", "ভাজি"}
# Confidence given to a match that needed a guess about the surrounding words.
GUESS_SCORE = 0.75
# Short words differ by one letter too easily ("begun" vs "beguni"): demand a closer match.
SHORT_WORD_LEN = 6
SHORT_WORD_THRESHOLD = 93


@dataclass
class Match:
    food: Food
    score: float  # 0..1
    matched_on: str


class FoodIndex:
    """In-memory lookup over all foods. Rebuilt whenever the table changes."""

    def __init__(self, foods: list[Food], threshold: int = 88):
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
        need = max(self.threshold, SHORT_WORD_THRESHOLD) if min(len(name), len(choice)) <= SHORT_WORD_LEN else self.threshold
        if score >= need:
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
        whole = self._exact(key)
        if whole:
            return [whole], []
        words = key.split(" ")
        if len(words) == 1:
            fuzzy = self._fuzzy(key)
            return ([fuzzy], []) if fuzzy else ([], [key])
        # A fuzzy match on the whole phrase ("alu bhorta" ~ "alu vorta") is only trusted when
        # no word of the phrase is itself an exact food name ("chicken burger" has "chicken").
        if not any(self._exact(w) for w in words):
            fuzzy = self._fuzzy(key)
            if fuzzy:
                return [fuzzy], []

        # Pass 1: longest EXACT alias first, so "begun bhaja" is never read as a fuzzy "beguni".
        # Pass 2: fuzzy, only on the words no exact alias claimed.
        # parts: ("match", Match, words) | ("left", None, words)
        parts: list[tuple[str, Match | None, list[str]]] = []
        i = 0
        while i < len(words):
            found = None
            for span in (3, 2, 1):
                if i + span > len(words):
                    continue
                m = self._exact(" ".join(words[i : i + span]))
                if m:
                    found = (m, span)
                    break
            if found:
                parts.append(("match", found[0], words[i : i + found[1]]))
                i += found[1]
            else:
                if parts and parts[-1][0] == "left":
                    parts[-1][2].append(words[i])
                else:
                    parts.append(("left", None, [words[i]]))
                i += 1
        resolved: list[tuple[str, Match | None, list[str]]] = []
        for kind, m, ws in parts:
            if kind == "match":
                resolved.append((kind, m, ws))
                continue
            j = 0
            pending: list[str] = []
            while j < len(ws):
                fm = None
                for span in (3, 2, 1):
                    if j + span <= len(ws):
                        fm = self._fuzzy(" ".join(ws[j : j + span]))
                        if fm:
                            break
                if fm:
                    if pending:
                        resolved.append(("left", None, pending))
                        pending = []
                    resolved.append(("match", fm, ws[j : j + span]))
                    j += span
                else:
                    pending.append(ws[j])
                    j += 1
            if pending:
                resolved.append(("left", None, pending))

        # Words left over next to a match decide how much we trust it:
        # * only cooking descriptors ("gorom bhat")            -> ignore them;
        # * a frying word ("chicken fry", "fried rice")         -> keep the match, mark it a guess;
        # * unknown words BEFORE the food ("panta bhat")        -> a modifier: keep, mark it a guess;
        # * unknown words AFTER the food ("chicken burger")     -> the last word names the dish and we
        #   do not know it, so this is a different food: no match, the whole phrase is unmatched.
        matches: list[Match] = []
        leftovers: list[str] = []
        n = len(resolved)
        skip: set[int] = set()
        for idx, (kind, m, ws) in enumerate(resolved):
            if kind != "match" or m is None:
                continue
            before = resolved[idx - 1] if idx > 0 and resolved[idx - 1][0] == "left" and idx - 1 not in skip else None
            after = resolved[idx + 1] if idx + 1 < n and resolved[idx + 1][0] == "left" else None
            # Words between two foods ("bhat ghono dal") describe the NEXT food, not this one.
            if after and idx + 2 < n and resolved[idx + 2][0] == "match":
                after = None

            def unknown(part) -> list[str]:
                return [w for w in part[2] if w not in DESCRIPTOR_WORDS and w not in METHOD_WORDS] if part else []

            def method(part) -> bool:
                return bool(part) and any(w in METHOD_WORDS for w in part[2])

            if unknown(after):
                # head word unknown -> reject the match and give the user the whole phrase to fix
                phrase = [*(before[2] if before else []), *ws, *after[2]]
                if before:
                    skip.add(idx - 1)
                skip.add(idx + 1)
                leftovers.append(" ".join(phrase))
                continue
            score = m.score
            label = m.matched_on
            if unknown(before) or method(before) or method(after):
                score = min(score, GUESS_SCORE)
                label = " ".join([*(before[2] if before else []), *ws, *(after[2] if after else [])])
            if before:
                skip.add(idx - 1)
            if after:
                skip.add(idx + 1)
            matches.append(Match(m.food, score, label))
        for idx, (kind, _m, ws) in enumerate(resolved):
            if kind == "left" and idx not in skip:
                leftovers.append(" ".join(ws))
        # Drop leftovers that are only cooking descriptors when something matched.
        if matches:
            leftovers = [p for p in leftovers if not set(p.split(" ")) <= DESCRIPTOR_WORDS | METHOD_WORDS]
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
