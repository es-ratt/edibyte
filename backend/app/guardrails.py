"""Safety guardrails for the coach.

Keyword-based on purpose: predictable and testable. Categories:
* condition: diabetes, blood pressure, cholesterol, heart -> general WHO food guidance + see a doctor
  (not a flat refusal; never personal or medical advice);
* allergy: "I can't verify this" + check labels + ask a doctor;
* medical: medicines, treatment, diagnosis, other diseases -> redirect to a doctor;
* pregnancy: redirect to a doctor or dietitian;
* eating_disorder: very low intake, purging, crash diets -> kind redirect + support;
* teen_weight: weight-loss questions from users under 18 -> doctor or dietitian (teen safety).
Messages use the informal "tumi" tone of the app.
"""

from __future__ import annotations

import re

from .schemas import Lang
from .text import normalize

CONDITION = [
    "diabetes", "diabetic", "ডায়াবেটিস", "ডায়াবেটিক", "diabetis", "sugar er rog", "ডায়াবেটিসের",
    "blood pressure", "high pressure", "bp", "প্রেশার", "রক্তচাপ", "hypertension",
    "heart disease", "হৃদরোগ", "cholesterol", "কোলেস্টেরল",
]  # fmt: skip
ALLERGY = ["allergy", "allergic", "allergies", "অ্যালার্জি", "এলার্জি", "allergi", "elarji", "alarji"]
MEDICAL = [
    "kidney", "কিডনি", "liver", "লিভার", "cancer", "ক্যান্সার", "thyroid", "থাইরয়েড", "gastric", "ulcer",
    "আলসার", "pcos", "medicine", "medication", "ওষুধ", "oshudh", "osudh", "insulin", "ইনসুলিন", "cure",
    "treatment", "চিকিৎসা", "diagnose", "রোগের", "disease", "supplement", "pill", "pills",
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
WEIGHT_LOSS = [
    "lose weight", "weight loss", "losing weight", "slim", "get thin", "fat burn", "burn fat", "diet plan",
    "ojon komate", "ojon komabo", "ojon komano", "ওজন কমাতে", "ওজন কমাব", "ওজন কমানো", "রোগা হতে", "moja komate",
]  # fmt: skip
# e.g. "500 calorie diet", "৮০০ ক্যালরি", "eat 600 kcal"
_LOW_KCAL = re.compile(r"\b([1-9]\d{2})\s*(kcal|cal|calorie|calories|ক্যালরি|ক্যালোরি|kalori)")
TEEN_MAX_AGE = 17

# The general guidance repeats only facts that are in data/reference_targets.csv (WHO fact sheet).
WHO_URL = "https://www.who.int/news-room/fact-sheets/detail/healthy-diet"

MESSAGES = {
    "condition": {
        "bn": "ডায়াবেটিস, রক্তচাপ বা কোলেস্টেরলের মতো অবস্থায় কী খাবে, সেটা একজন ডাক্তার বা রেজিস্টার্ড পুষ্টিবিদ তোমার জন্য ঠিক করবেন। সবার জন্য সাধারণ কিছু কথা (WHO): বাড়তি চিনি আর লবণ কম রাখো, প্রতিদিন শাকসবজি ও ফল খাও, স্যাচুরেটেড আর ট্রান্স ফ্যাট কম রাখো। এটা ব্যক্তিগত চিকিৎসা পরামর্শ নয়।",
        "en": "For diabetes, blood pressure or cholesterol, a doctor or registered dietitian should guide what you eat. General points for everyone (WHO): keep free sugars and salt low, eat vegetables and fruit every day, and keep saturated and trans fat low. This is not personal medical advice.",
        "banglish": "Diabetes, blood pressure ba cholesterol er moto obosthay ki khabe, seta ekjon doctor ba registered dietitian tomar jonno thik korben. Shobar jonno general kichu kotha (WHO): barti chini ar lobon kom rakho, protidin shak-shobji ar fol khao, saturated ar trans fat kom rakho. Eta personal medical advice na.",
    },
    "allergy": {
        "bn": "কোনো খাবার তোমার অ্যালার্জির জন্য নিরাপদ কিনা, আমি যাচাই করতে পারি না, ছবি বা নাম দেখে তো নয়ই। প্যাকেটের উপকরণের তালিকা দেখো, রান্না যে করেছে তাকে জিজ্ঞেস করো, আর অ্যালার্জি থাকলে ডাক্তারের সাথে কথা বলো।",
        "en": "I can't verify whether a food is safe for your allergy, especially not from a photo or a name. Check the ingredient list, ask whoever cooked it, and talk to a doctor about your allergy.",
        "banglish": "Kono khabar tomar allergy r jonno safe kina, ami verify korte pari na, chobi ba nam dekhe to noy-i. Packet er upokoron er list dekho, je ranna koreche take jiggesh koro, ar allergy thakle doctor er sathe kotha bolo.",
    },
    "medical": {
        "bn": "ওষুধ, চিকিৎসা বা কোনো রোগ নিয়ে পরামর্শ দেওয়া আমার কাজ নয়। একজন ডাক্তার বা রেজিস্টার্ড পুষ্টিবিদের সাথে কথা বলো। সাধারণ খাবার ও পুষ্টি নিয়ে আমি সাহায্য করতে পারি।",
        "en": "I can't advise on medicines, treatment or illnesses. Please talk to a doctor or a registered dietitian. I'm happy to help with general food and nutrition questions.",
        "banglish": "Oshudh, chikitsha ba kono rog niye poramorsho dewa amar kaj na. Ekjon doctor ba registered dietitian er sathe kotha bolo. General khabar ar nutrition niye help korte pari.",
    },
    "pregnancy": {
        "bn": "গর্ভাবস্থা বা বুকের দুধ খাওয়ানোর সময় পুষ্টির চাহিদা আলাদা হয়। তোমার ডাক্তার বা পুষ্টিবিদের পরামর্শ নাও। নিজের যত্ন নিও!",
        "en": "Nutrition needs are different during pregnancy or breastfeeding. Please ask your doctor or a dietitian for advice that fits you. Take good care!",
        "banglish": "Pregnancy ba breastfeeding er shomoy nutrition er chahida alada. Tomar doctor ba dietitian er poramorsho nao. Nijer jotno nio!",
    },
    "eating_disorder": {
        "bn": "খুব কম খাওয়া বা খাবার বাদ দেওয়া শরীরের জন্য ক্ষতিকর হতে পারে। খাবার নিয়ে কষ্ট হলে তোমার বিশ্বাসের কারো সাথে কথা বলো, একজন ডাক্তার বা কাউন্সেলরের সাথেও। তুমি একা নও।",
        "en": "Eating very little or skipping food can harm your body. If food feels hard right now, talk to someone you trust, and to a doctor or counsellor. You are not alone.",
        "banglish": "Khub kom khawa ba khabar bad dewa shorirer jonno khotikor hote pare. Khabar niye koshto hole tomar bishwasher karo sathe kotha bolo, ekjon doctor ba counsellor er sathe-o. Tumi eka nao.",
    },
    "teen_weight": {
        "bn": "তোমার বয়সে শরীর বাড়ছে, তাই ওজন কমানোর ডায়েট নিরাপদ নয়। ওজন নিয়ে চিন্তা থাকলে একজন ডাক্তার বা পুষ্টিবিদের সাথে কথা বলো। আমি তোমাকে ভারসাম্য রেখে খেতে সাহায্য করতে পারি।",
        "en": "Your body is still growing, so weight-loss diets are not safe at your age. If you're worried about your weight, talk to a doctor or a dietitian. I can help you eat in a balanced way.",
        "banglish": "Tomar boyoshe shorir barche, tai ojon komanor diet safe na. Ojon niye chinta thakle ekjon doctor ba dietitian er sathe kotha bolo. Ami tomake balance rekhe khete help korte pari.",
    },
}

# Categories whose answer cites the WHO healthy-diet fact sheet.
CITES_WHO = {"condition"}


def _contains(text: str, words: list[str]) -> bool:
    for w in words:
        if " " in w or not w.isascii():
            if w in text:
                return True
        elif re.search(rf"\b{re.escape(w)}\b", text):
            return True
    return False


def check(question: str, age: int | None = None) -> str | None:
    """Return a guardrail category or None if the question is fine."""
    t = normalize(question)
    if _contains(t, PREGNANCY):
        return "pregnancy"
    if _contains(t, EXTREME):
        return "eating_disorder"
    m = _LOW_KCAL.search(t)
    if m and int(m.group(1)) < 1000 and re.search(r"diet|eat|day|din|dine|খাব|খাই|খেয়ে|ডায়েট", t):
        return "eating_disorder"
    if age is not None and age <= TEEN_MAX_AGE and _contains(t, WEIGHT_LOSS):
        return "teen_weight"
    if _contains(t, ALLERGY):
        return "allergy"
    if _contains(t, CONDITION):
        return "condition"
    if _contains(t, MEDICAL):
        return "medical"
    return None


def message(category: str, lang: Lang) -> str:
    return MESSAGES[category][lang]
