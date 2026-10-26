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
