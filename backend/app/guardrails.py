"""Safety guardrails for the coach.

Questions about medical conditions, pregnancy, or extreme dieting /
eating-disorder behaviour get a kind redirect to a doctor or dietitian
instead of advice. Keyword-based on purpose: predictable and testable.
"""

from __future__ import annotations

import re

from .schemas import Lang
from .text import normalize

MEDICAL = [
    "diabetes", "diabetic", "ডায়াবেটিস", "ডায়াবেটিক", "diabetis", "sugar er rog", "ডায়াবেটিসের",
    "blood pressure", "high pressure", "bp", "প্রেশার", "রক্তচাপ", "hypertension",
    "kidney", "কিডনি", "liver", "লিভার", "heart disease", "হৃদরোগ", "cancer", "ক্যান্সার",
    "thyroid", "থাইরয়েড", "cholesterol", "কোলেস্টেরল", "gastric", "ulcer", "আলসার", "pcos",
    "medicine", "medication", "ওষুধ", "oshudh", "osudh", "insulin", "ইনসুলিন",
    "cure", "treatment", "চিকিৎসা", "diagnose", "রোগের", "disease", "allergy", "অ্যালার্জি",
]  # fmt: skip
PREGNANCY = [
    "pregnant", "pregnancy", "pregnent", "গর্ভবতী", "গর্ভাবস্থা", "gorbhoboti", "gorbhobosthay",
    "breastfeeding", "breast feeding", "বুকের দুধ খাওয়া", "lactating", "প্রেগন্যান্ট",
]  # fmt: skip
EXTREME = [
    "starve", "starving", "না খেয়ে", "na kheye", "na khe", "skip all meals", "stop eating",
    "vomit", "বমি করে", "purge", "laxative", "anorexia", "bulimia", "eating disorder",
    "lose 10 kg in a week", "crash diet", "ক্র্যাশ ডায়েট", "water fast", "only water",
    "শুধু পানি", "shudhu pani",
]  # fmt: skip
# e.g. "500 calorie diet", "৮০০ ক্যালরি", "eat 600 kcal"
_LOW_KCAL = re.compile(r"\b([1-9]\d{2})\s*(kcal|cal|calorie|calories|ক্যালরি|ক্যালোরি|kalori)")

MESSAGES = {
    "medical": {
        "bn": "এই প্রশ্নটা আপনার স্বাস্থ্যের অবস্থার সাথে জড়িত, তাই এখানে নিরাপদ পরামর্শ দিতে পারছি না। একজন ডাক্তার বা রেজিস্টার্ড পুষ্টিবিদের সাথে কথা বলুন। আমি সাধারণ খাবার ও পুষ্টি নিয়ে সাহায্য করতে পারি।",
        "en": "This question is about a health condition, so I can't give safe advice on it here. Please talk to a doctor or a registered dietitian. I'm happy to help with general food and nutrition questions.",
        "banglish": "Ei proshno ta health condition er sathe jorito, tai ekhane safe advice dite parchi na. Please ekjon doctor ba registered dietitian er sathe kotha bolun. General khabar ar nutrition niye help korte pari.",
    },
    "pregnancy": {
        "bn": "গর্ভাবস্থা বা বুকের দুধ খাওয়ানোর সময় পুষ্টির চাহিদা আলাদা হয়। দয়া করে আপনার ডাক্তার বা পুষ্টিবিদের পরামর্শ নিন। আপনার যত্ন নিন!",
        "en": "Nutrition needs are different during pregnancy or breastfeeding. Please ask your doctor or a dietitian for advice that fits you. Take good care!",
        "banglish": "Pregnancy ba breastfeeding er shomoy nutrition er chahida alada. Please apnar doctor ba dietitian er poramorsho nin. Nijer jotno nin!",
    },
    "eating_disorder": {
        "bn": "খুব কম খাওয়া বা খাবার বাদ দেওয়া শরীরের জন্য ক্ষতিকর হতে পারে। আপনি যদি খাবার নিয়ে কষ্টে থাকেন, একজন ডাক্তার বা কাউন্সেলরের সাথে কথা বলুন। আপনি একা নন।",
        "en": "Eating very little or skipping food can harm your body. If you are struggling with food, please talk to a doctor or a counsellor. You are not alone.",
        "banglish": "Khub kom khawa ba khabar bad deya shorirer jonno khotikor hote pare. Khabar niye koshto pele ekjon doctor ba counsellor er sathe kotha bolun. Apni eka non.",
    },
}


def _contains(text: str, words: list[str]) -> bool:
    for w in words:
        if " " in w or not w.isascii():
            if w in text:
                return True
        elif re.search(rf"\b{re.escape(w)}\b", text):
            return True
    return False


def check(question: str) -> str | None:
    """Return a guardrail category or None if the question is fine."""
    t = normalize(question)
    if _contains(t, PREGNANCY):
        return "pregnancy"
    if _contains(t, EXTREME):
        return "eating_disorder"
    m = _LOW_KCAL.search(t)
    if m and int(m.group(1)) < 1000 and re.search(r"diet|eat|day|din|dine|খাব|খাই|খেয়ে|ডায়েট", t):
        return "eating_disorder"
    if _contains(t, MEDICAL):
        return "medical"
    return None


def message(category: str, lang: Lang) -> str:
    return MESSAGES[category][lang]
