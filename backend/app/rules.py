"""Deterministic nutrition rules engine.

Every number in a report is computed here from Food rows in the database.
No LLM is involved. Constants come from nutrition_config.py.
"""

from __future__ import annotations

from . import nutrition_config as C
from .models import Food, Tip
from .schemas import (
    Lang,
    Nutrients,
    Profile,
    ReportItemIn,
    ReportItemOut,
    ReportResponse,
    SwapOut,
    Targets,
    TipOut,
)
from .store import all_tips, brief, foods_by_id
from .units import to_grams

DISCLAIMER = {
    "bn": "এটি সাধারণ পুষ্টি তথ্য, চিকিৎসা পরামর্শ নয়।",
    "en": "This is general nutrition information, not medical advice.",
    "banglish": "Eta general nutrition information, medical advice na.",
}

DEFAULT_PROFILE = Profile()


def _r(x: float, nd: int = 1) -> float:
    return round(x, nd)


# --- targets -----------------------------------------------------------------


def compute_targets(p: Profile) -> Targets:
    bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + C.MIFFLIN_SEX_OFFSET[p.sex]
    tdee = bmr * C.ACTIVITY_FACTORS[p.activity]
    kcal = tdee * C.GOAL_CALORIE_MULTIPLIER[p.goal]
    floor = C.MIN_KCAL_FLOOR[p.sex]
    floor_applied = kcal < floor
    kcal = max(kcal, floor)

    protein = p.weight_kg * C.PROTEIN_G_PER_KG[p.goal]
    fat = kcal * C.FAT_ENERGY_SHARE / C.KCAL_PER_G_FAT
    carbs = max(0.0, (kcal - protein * C.KCAL_PER_G_PROTEIN - fat * C.KCAL_PER_G_FAT) / C.KCAL_PER_G_CARB)
    return Targets(
        kcal=round(kcal),
        protein_g=_r(protein, 0),
        carbs_g=_r(carbs, 0),
        fat_g=_r(fat, 0),
        fiber_g=C.FIBER_TARGET_G,
        bmr=round(bmr),
        tdee=round(tdee),
        floor_applied=floor_applied,
        floor_kcal=floor,
    )


# --- per-item nutrition --------------------------------------------------------


def item_nutrients(food: Food, grams: float) -> Nutrients:
    f = grams / 100.0  # Food nutrients are per 100 g
    return Nutrients(
        kcal=_r(food.kcal * f, 0),
        protein_g=_r(food.protein_g * f),
        carbs_g=_r(food.carbs_g * f),
        fat_g=_r(food.fat_g * f),
        fiber_g=_r((food.fiber_g or 0) * f),
    )


def _sum(rows: list[Nutrients]) -> Nutrients:
    return Nutrients(
        kcal=_r(sum(r.kcal for r in rows), 0),
        protein_g=_r(sum(r.protein_g for r in rows)),
        carbs_g=_r(sum(r.carbs_g for r in rows)),
        fat_g=_r(sum(r.fat_g for r in rows)),
        fiber_g=_r(sum(r.fiber_g for r in rows)),
    )


def _pct(total: Nutrients, target: Targets) -> Nutrients:
    def p(a: float, b: float) -> float:
        return _r(100 * a / b, 0) if b else 0.0

    return Nutrients(
        kcal=p(total.kcal, target.kcal),
        protein_g=p(total.protein_g, target.protein_g),
        carbs_g=p(total.carbs_g, target.carbs_g),
        fat_g=p(total.fat_g, target.fat_g),
        fiber_g=p(total.fiber_g, target.fiber_g),
    )


# --- tips ----------------------------------------------------------------------


def tip_text(tip: Tip, lang: Lang) -> str:
    return {"bn": tip.text_bn, "en": tip.text_en, "banglish": tip.text_bl}[lang]


def choose_tip_ids(foods: list[Food], totals: Nutrients, targets: Targets, profile: Profile) -> list[tuple[str, str]]:
    """Return [(tip_id, rule_name)] in priority order (max 3)."""
    tags = {t for f in foods for t in f.tags}
    picks: list[tuple[str, str]] = []

    def add(tip_id: str, rule: str) -> None:
        if tip_id not in [p[0] for p in picks]:
            picks.append((tip_id, rule))

    carb_energy = totals.carbs_g * C.KCAL_PER_G_CARB
    if totals.kcal > C.MEAL_LARGE_KCAL_SHARE * targets.kcal:
        add("portion_size", "large_meal")
    if totals.protein_g < C.MEAL_LOW_PROTEIN_SHARE * targets.protein_g:
        add("muscle_protein" if profile.goal == "gain_muscle" else "add_protein", "low_protein")
    if totals.kcal > 0 and carb_energy / totals.kcal > C.HIGH_CARB_ENERGY_SHARE:
        add("balance_rice", "high_carb")
    if "fried" in tags:
        add("limit_fried", "fried_item")
    if "sweet" in tags:
        add("limit_sugar", "sweet_item")
    if totals.fiber_g < C.LOW_FIBER_PER_MEAL_G and not ({"vegetable", "fruit"} & tags):
        add("add_vegetables", "low_fiber")
    # Goal-specific tip, then a positive one if nothing needed fixing.
    if profile.goal == "lose":
        add("weight_loss_slow", "goal_lose")
    elif profile.goal == "gain_muscle":
        add("muscle_protein", "goal_gain_muscle")
    if not picks:
        add("good_balance", "balanced")
    add("drink_water", "general")
    return picks[:3]


# --- swaps (only with real price data) -------------------------------------------


def find_swaps(foods: list[Food], profile: Profile) -> tuple[list[SwapOut], str | None]:
    priced = [f for f in foods_by_id().values() if f.price_bdt_estimate is not None and f.price_source]
    if not priced:
        return [], "no_price_data"
    swaps: list[SwapOut] = []
    for f in foods:
        if f.price_bdt_estimate is None:
            continue
        options = [
            o
            for o in priced
            if o.id != f.id
            and o.category == f.category
            and o.price_bdt_estimate < f.price_bdt_estimate
            and o.protein_g * o.serving_grams >= 0.8 * f.protein_g * f.serving_grams
            and _diet_ok(o, profile)
        ]
        if options:
            best = min(options, key=lambda o: o.price_bdt_estimate or 0)
            swaps.append(
                SwapOut(
                    from_food=brief(f),
                    to_food=brief(best),
                    from_price_bdt=f.price_bdt_estimate,
                    to_price_bdt=best.price_bdt_estimate,
                    saving_bdt=_r(f.price_bdt_estimate - best.price_bdt_estimate, 0),
                    price_date=best.price_date,
                    price_source=best.price_source,
                )
            )
    return swaps[:3], (None if swaps else "no_cheaper_option")


def _diet_ok(food: Food, profile: Profile) -> bool:
    if profile.diet == "vegetarian":
        return food.category not in {"meat", "fish"} and not ({"meat", "fish"} & set(food.tags))
    if profile.diet == "no_beef":
        return "beef" not in food.tags
    return True


# --- report --------------------------------------------------------------------


def build_report(items_in: list[ReportItemIn], profile: Profile | None, lang: Lang) -> ReportResponse:
    profile = profile or DEFAULT_PROFILE
    foods = foods_by_id()
    rows: list[ReportItemOut] = []
    used: list[Food] = []
    for it in items_in:
        food = foods.get(it.food_id)
        if food is None:
            raise KeyError(it.food_id)
        grams, assumed = to_grams(food, it.quantity, it.unit)
        rows.append(
            ReportItemOut(
                food=brief(food),
                quantity=it.quantity,
                unit=it.unit,
                grams=grams,
                assumed=assumed,
                nutrients=item_nutrients(food, grams),
                source=food.source,
                fiber_known=food.fiber_g is not None,
            )
        )
        used.append(food)

    totals = _sum([r.nutrients for r in rows])
    targets = compute_targets(profile)
    tips_by_id = {t.id: t for t in all_tips()}
    tips = [
        TipOut(id=tid, text=tip_text(tips_by_id[tid], lang), rule=rule, verified=tips_by_id[tid].verified,
               source=tips_by_id[tid].source)
        for tid, rule in choose_tip_ids(used, totals, targets, profile)
        if tid in tips_by_id
    ]  # fmt: skip
    swaps, swaps_note = find_swaps(used, profile)
    return ReportResponse(
        items=rows,
        totals=totals,
        targets=targets,
        percent_of_target=_pct(totals, targets),
        tips=tips,
        swaps=swaps,
        swaps_note=swaps_note,
        has_unverified=any(not f.verified for f in used),
        profile_used=profile,
        lang=lang,
        disclaimer=DISCLAIMER[lang],
    )
