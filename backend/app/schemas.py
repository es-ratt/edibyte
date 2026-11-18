"""Request / response models for the HTTP API (see API_CONTRACT.md)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .nutrition_config import PROFILE_LIMITS

Lang = Literal["bn", "en", "banglish"]
Mode = Literal["ai", "offline"]
Goal = Literal["lose", "maintain", "gain_muscle"]
Sex = Literal["male", "female", "unspecified"]
Activity = Literal["sedentary", "light", "moderate", "active", "very_active"]
Diet = Literal["any", "vegetarian", "no_beef"]


class FoodOut(BaseModel):
    id: str
    name_bn: str
    name_en: str
    aliases: list[str]
    category: str
    serving_desc_bn: str
    serving_desc_en: str
    serving_grams: float
    piece_grams: float | None = None
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float | None
    price_bdt_estimate: float | None
    price_date: str | None
    price_source: str | None
    tags: list[str]
    source: str
    source_url: str | None
    verified: bool
    notes: str | None


class FoodBrief(BaseModel):
    id: str
    name_bn: str
    name_en: str
    name_bl: str = Field(description="Banglish display name (first Latin-script alias)")
    category: str
    serving_desc_bn: str
    serving_desc_en: str
    serving_grams: float
    piece_grams: float | None = Field(default=None, description="Weight of one piece, or null when not known")
    verified: bool


class Profile(BaseModel):
    goal: Goal = "maintain"
    sex: Sex = "unspecified"
    age: int = Field(25, ge=PROFILE_LIMITS["age"][0], le=PROFILE_LIMITS["age"][1])
    height_cm: float = Field(165, ge=PROFILE_LIMITS["height_cm"][0], le=PROFILE_LIMITS["height_cm"][1])
    weight_kg: float = Field(60, ge=PROFILE_LIMITS["weight_kg"][0], le=PROFILE_LIMITS["weight_kg"][1])
    activity: Activity = "light"
    diet: Diet = "any"
    daily_budget_bdt: float | None = Field(None, ge=0, le=100_000)


class DemoProfile(BaseModel):
    id: str
    name_bn: str
    name_en: str
    name_bl: str
    description_en: str
    profile: Profile
    is_demo: bool = True


# --- /meal/parse -------------------------------------------------------------


class ParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    lang: Lang = "bn"


class ParsedItem(BaseModel):
    raw_name: str
    food: FoodBrief
    quantity: float | None
    unit: str | None
    grams: float
    assumed: bool = Field(description="True when no quantity was given and one default serving was used")
    confidence: float = Field(ge=0, le=1)
    uncertain: bool = Field(default=False, description="True when the match is a guess (confidence below 0.9): show 'not sure'")
    portion_note: str | None = Field(default=None, description="'piece_weight_unknown' when a piece count could not be converted to grams")


class UnmatchedItem(BaseModel):
    raw_name: str
    quantity: float | None
    unit: str | None
    suggestions: list[FoodBrief]


class ParseResponse(BaseModel):
    items: list[ParsedItem]
    unmatched: list[UnmatchedItem]
    normalized_text: str
    lang: Lang
    mode: Mode
    warnings: list[str] = []


# --- /meal/report ------------------------------------------------------------


class ReportItemIn(BaseModel):
    food_id: str
    quantity: float | None = Field(None, ge=0, le=5000)
    unit: str | None = None


class ReportRequest(BaseModel):
    items: list[ReportItemIn] = Field(min_length=1, max_length=30)
    profile: Profile | None = None
    lang: Lang = "bn"
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] | None = None
    session_id: str | None = Field(None, max_length=64)


class Nutrients(BaseModel):
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float


class ReportItemOut(BaseModel):
    food: FoodBrief
    quantity: float | None
    unit: str | None
    grams: float
    assumed: bool
    nutrients: Nutrients
    source: str
    fiber_known: bool


class Targets(Nutrients):
    bmr: float
    tdee: float
    floor_applied: bool
    floor_kcal: float


class TipOut(BaseModel):
    id: str
    text: str
    rule: str
    verified: bool
    source: str


class SwapOut(BaseModel):
    from_food: FoodBrief
    to_food: FoodBrief
    from_price_bdt: float
    to_price_bdt: float
    saving_bdt: float
    price_date: str | None
    price_source: str | None
    estimated: bool = True


class ReportResponse(BaseModel):
    items: list[ReportItemOut]
    totals: Nutrients
    targets: Targets
    percent_of_target: Nutrients
    tips: list[TipOut]
    swaps: list[SwapOut]
    swaps_note: str | None
    has_unverified: bool
    profile_used: Profile
    lang: Lang
    disclaimer: str


# --- /coach ------------------------------------------------------------------


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class CoachRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    lang: Lang = "bn"
    profile: Profile | None = None
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)


class SourceOut(BaseModel):
    type: Literal["food", "tip"]
    id: str
    title: str
    source: str
    verified: bool


class CoachResponse(BaseModel):
    answer: str
    sources: list[SourceOut]
    lang: Lang
    mode: Mode
    guardrail: str | None = None


# --- /meal/check (v2 report) ---------------------------------------------------------
# Language-neutral: the server returns numbers and codes; the app renders text in bn/en/banglish.

Confidence = Literal["high", "medium", "low"]


class CheckItemIn(BaseModel):
    food_id: str = Field(min_length=1, max_length=64)
    quantity: float | None = Field(None, ge=0, le=5000)
    unit: str | None = Field(None, max_length=20)
    # How the item and its portion were obtained. "photo" portions are rougher.
    source: Literal["photo", "text", "manual"] = "manual"
    match_confidence: float = Field(1.0, ge=0, le=1)


class CheckAnswers(BaseModel):
    """The questions a photo cannot answer."""

    oil: Literal["none", "little", "normal", "lot", "unknown"] = "unknown"
    fried: Literal["yes", "no", "unknown"] = "unknown"
    sugar_spoons: int | None = Field(None, ge=0, le=10)


class CheckProfile(BaseModel):
    """Profile summary only: no birth date, body numbers or avoid list leave the device."""

    age: int = Field(ge=13, le=80)
    sex: Literal["female", "male", "unspecified"] = "unspecified"
    activity: Literal["low", "medium", "high"] = "medium"
    goal: Literal["balanced", "energy", "muscle", "maintain"] = "balanced"
    diet: Literal["any", "vegetarian", "no_beef"] = "any"


class CheckRequest(BaseModel):
    items: list[CheckItemIn] = Field(min_length=1, max_length=30)
    answers: CheckAnswers = Field(default_factory=CheckAnswers)
    profile: CheckProfile | None = None
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] | None = None


class Amount(BaseModel):
    value: float
    low: float
    high: float
    unit: str


class CheckItemOut(BaseModel):
    food: FoodBrief
    quantity: float | None
    unit: str | None
    grams: float
    grams_low: float
    grams_high: float
    assumed: bool
    portion_note: str | None
    confidence: Confidence
    confidence_reasons: list[str]
    groups: list[str]
    tags: list[str]
    source: str
    method: str
    verified: bool


class NutrientLine(BaseModel):
    nutrient: str
    unit: str
    value: float | None = Field(description="null = not in our data yet")
    low: float | None
    high: float | None
    complete: bool = Field(description="False when some foods in the meal have no value for this nutrient")
    status: str
    # "get enough": % of your daily target (only with a sourced target)
    pct_of_target: float | None = None
    target_value: float | None = None
    # "go easy": share of this meal's energy, or % of your daily limit (only with a sourced limit)
    share_of_meal_energy_pct: float | None = None
    pct_of_limit: float | None = None
    limit_value: float | None = None
    limit_unit: str | None = None
    limit_status: Literal["sourced", "pending", "none"] = "none"
    limit_source_url: str | None = None


class AddedSugar(BaseModel):
    spoons: int
    grams: float
    method: Literal["estimate"] = "estimate"


class VerdictReason(BaseModel):
    code: str
    kind: Literal["good", "tip", "warn"]
    food_ids: list[str] = []


class Verdict(BaseModel):
    level: Literal["fits", "mostly", "change"]
    reasons: list[VerdictReason]


class Suggestion(BaseModel):
    food: FoodBrief
    reason: str
    tags: list[str]


class Swap(BaseModel):
    from_food: FoodBrief
    to_food: FoodBrief
    reason: str
    # Tags of to_food, so the app can drop swaps to foods on the user's avoid list.
    to_tags: list[str] = []


class SourceRef(BaseModel):
    kind: Literal["food", "reference"]
    label: str
    url: str | None
    verified: bool
    rows: int


class CheckResponse(BaseModel):
    teen: bool | None
    items: list[CheckItemOut]
    energy: Amount
    macros: list[NutrientLine]
    get_enough: list[NutrientLine]
    go_easy: list[NutrientLine]
    added_sugar: AddedSugar | None
    plate: dict[str, bool]
    verdict: Verdict
    add_ons: list[Suggestion]
    swaps: list[Swap]
    notes: list[str]
    sources: list[SourceRef]
    method_note: str
