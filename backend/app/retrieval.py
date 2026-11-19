"""BM25 retrieval over foods + tips for the RAG coach.

Tokenisation is Bangla/Banglish aware:
* words are normalised and suffix-stripped ("ডিমের" -> "ডিম");
* any word or phrase that is a known food alias adds a canonical
  `food:<id>` token, so "dim", "ডিম" and "egg" all retrieve the same row;
* a small concept table maps everyday words to shared tokens
  ("আমিষ", "protein" -> `c:protein`).
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from rank_bm25 import BM25Okapi

from .models import Food, Tip
from .reference import ReferenceRow
from .text import stem_variants, tokenize

CONCEPTS: dict[str, list[str]] = {
    "protein": ["protein", "proteins", "প্রোটিন", "আমিষ", "amish", "muscle", "পেশি", "peshi"],
    "calorie": ["calorie", "calories", "kcal", "ক্যালরি", "ক্যালোরি", "kalori", "energy", "শক্তি"],
    "fiber": ["fiber", "fibre", "আঁশ", "ash", "ফাইবার"],
    "weight": ["weight", "ওজন", "ojon", "slim", "diet", "ডায়েট"],
    # Direction matters: a weight-loss tip must never answer a weight-gain question.
    "weight_loss": ["lose", "losing", "loss", "reduce", "komano", "komate", "komabo", "komai", "কমানো", "কমাতে", "কমাব", "কমাই"],
    "weight_gain": ["gain", "gaining", "barano", "barate", "barabo", "barai", "বাড়ানো", "বাড়াতে", "বাড়াব", "বাড়াই", "mota"],
    "sugar": ["sugar", "চিনি", "chini", "sweet", "মিষ্টি", "mishti"],
    "fried": ["fried", "ভাজা", "bhaja", "vaja", "oil", "তেল", "tel"],
    "budget": ["budget", "cheap", "cheaply", "cheaper", "cheapest", "taka", "টাকা", "khoroch", "খরচ", "সস্তা", "shosta", "price", "দাম", "dam"],
    "vegetable": ["vegetable", "vegetables", "সবজি", "shobji", "sobji", "শাক", "shak"],
    "fruit": ["fruit", "fruits", "ফল", "fol", "phol"],
    "water": ["water", "পানি", "pani", "jol", "জল"],
    "breakfast": ["breakfast", "নাস্তা", "nasta", "সকাল", "sokal"],
}
_CONCEPT_OF = {w: c for c, words in CONCEPTS.items() for w in words}

# Common words that carry no meaning for retrieval (en / banglish / bn).
STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "i", "me", "my", "you", "your", "we", "it", "this", "that",
    "of", "to", "in", "on", "for", "and", "or", "with", "what", "how", "which", "do", "does", "can",
    "should", "much", "many", "any", "some", "please", "tell", "about", "be", "have", "has", "if",
    "ki", "koto", "kon", "ar", "e", "te", "er", "ta", "ami", "amar", "apni", "ache", "hobe", "kore",
    "কি", "কী", "কত", "কোন", "আর", "আমি", "আমার", "আছে", "হবে", "করে", "এর", "ও", "যে", "এটা",
}  # fmt: skip


# A document that is not a food the user named must share this many question words.
MIN_SHARED_WORDS = 2
_OPPOSITES = [("c:weight_gain", "c:weight_loss"), ("c:weight_loss", "c:weight_gain")]


# Words that should find each sourced reference row (WHO healthy-diet facts).
REFERENCE_WORDS = {
    "free_sugars": "free sugar sugars added sugar sweet chini mishti চিনি মিষ্টি",
    "saturated_fat": "saturated fat fats chorbi চর্বি ফ্যাট",
    "trans_fat": "trans fat fats ট্রান্স ফ্যাট",
    "fruit_veg": "fruit fruits vegetable vegetables fol shobji sobji ফল সবজি শাকসবজি",
    "total_fat": "total fat fats chorbi চর্বি",
    "sodium": "salt sodium lobon লবণ",
}


@dataclass
class Doc:
    kind: str  # "food" | "tip" | "reference"
    id: str
    obj: Food | Tip | ReferenceRow
    tokens: list[str]


class Retriever:
    def __init__(self, foods: list[Food], tips: list[Tip], references: list[ReferenceRow] | None = None):
        # alias phrase (normalised, 1-3 words) -> food id
        self.alias: dict[str, str] = {}
        for f in foods:
            for a in [f.name_bn, f.name_en, f.id.replace("_", " "), *(f.aliases or [])]:
                key = " ".join(tokenize(a))
                if key:
                    self.alias.setdefault(key, f.id)
        self.docs: list[Doc] = []
        for f in foods:
            text = " ".join([f.name_bn, f.name_en, f.category, " ".join(f.aliases), " ".join(f.tags)])
            self.docs.append(Doc("food", f.id, f, self.tokens(text) + [f"food:{f.id}"] * 3))
        for t in tips:
            text = " ".join([t.text_bn, t.text_en, t.text_bl, " ".join(t.tags)])
            self.docs.append(Doc("tip", t.id, t, self.tokens(text)))
        for r in references or []:
            text = f"{r.nutrient.replace('_', ' ')} {REFERENCE_WORDS.get(r.nutrient, '')} who guideline limit day"
            self.docs.append(Doc("reference", r.nutrient, r, self.tokens(text)))
        self.bm25 = BM25Okapi([d.tokens for d in self.docs]) if self.docs else None

    def tokens(self, text: str) -> list[str]:
        words = tokenize(text)
        out: list[str] = []
        for w in words:
            if w in STOPWORDS:
                continue
            variants = stem_variants(w)
            out.extend(variants)
            for v in variants:
                if v in _CONCEPT_OF:
                    out.append(f"c:{_CONCEPT_OF[v]}")
                if v in self.alias:
                    out.append(f"food:{self.alias[v]}")
        # multi-word aliases ("murgir mangsho", "alu vorta")
        for n in (2, 3):
            for i in range(len(words) - n + 1):
                phrase = " ".join(words[i : i + n])
                if phrase in self.alias:
                    out.append(f"food:{self.alias[phrase]}")
        return out

    def _units(self, query: str) -> list[set[str]]:
        """One token set per meaningful query word (its variants, concept and food tokens)."""
        units: list[set[str]] = []
        for w in tokenize(query):
            if w in STOPWORDS:
                continue
            toks = set(self.tokens(w))
            if toks:
                units.append(toks)
        return units

    def search(self, query: str, k: int = 5) -> list[Doc]:
        """Rank foods and tips for a question.

        Relevance rules (so the coach says "I don't have data" instead of showing an
        unrelated tip):
        * a food the user named always counts;
        * anything else must share at least MIN_SHARED_WORDS different question words
          with the document (one shared word like "calories" or "weight" is not enough,
          unless the question has only one meaningful word);
        * a weight-loss document never answers a weight-gain question, and the reverse.
        """
        if not self.bm25:
            return []
        q = self.tokens(query)
        if not q:
            return []
        scores = list(self.bm25.get_scores(q))
        named = {t[5:] for t in q if t.startswith("food:")}
        units = self._units(query)
        need = min(MIN_SHARED_WORDS, len(units))
        qset = set(q)
        for i, d in enumerate(self.docs):
            if d.kind == "food" and d.id in named:
                scores[i] += 1000  # foods the user named explicitly always rank first
                continue
            doc = set(d.tokens)
            shared = sum(1 for u in units if u & doc)
            opposite = any(a in qset and b in doc and a not in doc for a, b in _OPPOSITES)
            if shared < need or opposite:
                scores[i] = 0
        ranked = sorted(range(len(self.docs)), key=lambda i: scores[i], reverse=True)
        return [self.docs[i] for i in ranked[:k] if scores[i] > 0]

    def named_foods(self, query: str) -> set[str]:
        return {t[5:] for t in self.tokens(query) if t.startswith("food:")}


@lru_cache
def get_retriever() -> Retriever:
    from .reference import PENDING_SOURCE, load_reference_rows
    from .store import all_foods, all_tips

    # Only rows with a sourced value are knowledge; pending rows are never quoted.
    refs = [r for r in load_reference_rows() if r.value is not None and r.source != PENDING_SOURCE]
    return Retriever(list(all_foods()), list(all_tips()), refs)
