"""Meal check engine (POST /meal/check).

Deterministic and language-neutral. Every number comes from Food rows (per 100 g) or from
data/reference_targets.csv; nothing comes from an LLM. Unknown nutrients stay None ("not in our data
yet"), never 0. Every amount carries a range from the item's confidence level.

Percentages:
* "get enough" (protein, fibre, iron, zinc, calcium): % of your daily target, only when a sourced
  target exists for the user's age/sex. Teen targets are pending, so these show status
  "target_pending".
* "go easy" (free sugars, saturated fat, trans fat): WHO limits are a share of daily energy. With no
  sourced energy target we show the share of THIS MEAL's energy next to the WHO figure, labelled as
  such (REBUILD_PLAN decision B2). Sodium: % of the daily limit only where WHO gives a number (adults).
"""

from __future__ import annotations

from collections.abc import Iterable

from . import nutrition_config as C
from .foodgroups import diet_ok, groups_for
from .models import Food
from .reference import ReferenceItem, targets_for
from .schemas import (
    AddedSugar,
    Amount,
    CheckItemOut,
    CheckRequest,
    CheckResponse,
    Confidence,
    NutrientLine,
    SourceRef,
    Suggestion,
    Swap,
    Verdict,
    VerdictReason,
)  # fmt: skip
from .store import brief, foods_by_id
from .units import piece_weight_unknown, to_grams

LEVELS: tuple[Confidence, ...] = ("high", "medium", "low")
KCAL_PER_G = {"protein": C.KCAL_PER_G_PROTEIN, "carb": C.KCAL_PER_G_CARB, "fat": C.KCAL_PER_G_FAT}

# nutrient code -> (Food attribute per 100 g, unit)
GET_ENOUGH = {
    "protein": ("protein_g", "g"),
    "fibre": ("fiber_g", "g"),
    "iron": ("iron_mg", "mg"),
    "zinc": ("zinc_mg", "mg"),
    "calcium": ("calcium_mg", "mg"),
}
GO_EASY = {
    "free_sugars": ("free_sugars_g", "g"),
    "saturated_fat": ("sat_fat_g", "g"),
    "trans_fat": ("trans_fat_g", "g"),
    "sodium": ("sodium_mg", "mg"),
}
MACROS = {"carbs": ("carbs_g", "g"), "fat": ("fat_g", "g")}
# Energy per gram for the "share of meal energy" of a go-easy nutrient (sugars are carbohydrate).
ENERGY_PER_G = {"free_sugars": C.KCAL_PER_G_CARB, "saturated_fat": C.KCAL_PER_G_FAT, "trans_fat": C.KCAL_PER_G_FAT}

METHOD_NOTE = (
    "Amounts = food-table value per 100 g x confirmed grams. Ranges use the confidence level "
    "(high +/-15%, medium +/-30%, low +/-50%); these widths are engineering defaults until the "
    "weighed-meal validation measures the real error. Unverified rows are team estimates."
)


def _down(level: Confidence, steps: int = 1) -> Confidence:
    return LEVELS[min(len(LEVELS) - 1, LEVELS.index(level) + steps)]


def _cap(level: Confidence, cap: Confidence) -> Confidence:
    return LEVELS[max(LEVELS.index(level), LEVELS.index(cap))]


def confidence_for(food: Food, source: str, assumed: bool, match_confidence: float) -> tuple[Confidence, list[str]]:
    """High for simple foods; Low for mixed, street, restaurant and packaged items."""
    reasons: list[str] = []
    level: Confidence = "high"
    if food.dish_type in C.LOW_CONFIDENCE_DISH_TYPES:
        level = "low"
        reasons.append("dish_varies")
    if not food.verified:
        level = _cap(level, "medium")
        reasons.append("unverified_data")
    if source == "photo":
        level = _cap(level, "medium")
        reasons.append("portion_from_photo")
    if assumed:
        level = _down(level)
        reasons.append("portion_assumed")
    if match_confidence < C.UNCERTAIN_BELOW:
        level = "low"
        reasons.append("match_unsure")
    return level, reasons


def _rng(value: float, level: Confidence) -> tuple[float, float]:
    f = C.CONFIDENCE_RANGE[level]
    return round(value * (1 - f), 1), round(value * (1 + f), 1)


def _sum_nutrient(rows: list[tuple[Food, float, Confidence]], attr: str) -> tuple[float | None, float | None, float | None, bool]:
    """(value, low, high, complete). Value is None when no food has data for this nutrient."""
    value = low = high = 0.0
    known = 0
    for food, grams, level in rows:
        per100 = getattr(food, attr)
        if per100 is None:
            continue
        v = per100 * grams / 100
        lo, hi = _rng(v, level)
        value, low, high, known = value + v, low + lo, high + hi, known + 1
    if known == 0:
        return None, None, None, False
    return round(value, 1), round(low, 1), round(high, 1), known == len(rows)


def _ref_by_nutrient(age: int | None, sex: str) -> dict[str, ReferenceItem]:
    if age is None:
        return {}
    return {i.nutrient: i for i in targets_for(age, sex)}  # type: ignore[arg-type]


def _get_enough(rows, refs: dict[str, ReferenceItem]) -> list[NutrientLine]:
    out = []
    for code, (attr, unit) in GET_ENOUGH.items():
        value, low, high, complete = _sum_nutrient(rows, attr)
        ref = refs.get(code)
        line = NutrientLine(nutrient=code, unit=unit, value=value, low=low, high=high, complete=complete, status="no_data")
        if value is not None:
            if ref and ref.status == "sourced" and ref.value:
                line.status = "ok"
                line.target_value = ref.value
                line.pct_of_target = round(100 * value / ref.value)
            else:
                line.status = "target_pending"
        out.append(line)
    return out


def _go_easy(rows, refs: dict[str, ReferenceItem], energy: float) -> list[NutrientLine]:
    out = []
    for code, (attr, unit) in GO_EASY.items():
        value, low, high, complete = _sum_nutrient(rows, attr)
        ref = refs.get(code)
        line = NutrientLine(nutrient=code, unit=unit, value=value, low=low, high=high, complete=complete, status="no_data")
        if ref is not None:
            line.limit_status = "sourced" if ref.status == "sourced" else "pending"
            line.limit_value, line.limit_unit, line.limit_source_url = ref.value, ref.unit, ref.url
        if value is not None:
            line.status = "partial" if not complete else "known"
            if complete and ref and ref.status == "sourced" and ref.value:
                if ref.unit == "% of daily energy" and energy > 0:
                    share = 100 * value * ENERGY_PER_G[code] / energy
                    line.share_of_meal_energy_pct = round(share)
                    line.status = "above" if share > ref.value else "within"
                elif ref.unit == "g per day" and code == "sodium":
                    pct = 100 * (value / 1000) / ref.value
                    line.pct_of_limit = round(pct)
                    line.status = "known"
        out.append(line)
    return out


def _brief_list(foods: Iterable[Food]) -> list[str]:
    return [f.id for f in foods]


def check_meal(req: CheckRequest) -> CheckResponse:
    foods = foods_by_id()
    profile = req.profile
    oil_lot = req.answers.oil == "lot"
    notes: list[str] = []

    items: list[CheckItemOut] = []
    rows: list[tuple[Food, float, Confidence]] = []
    meal_groups: set[str] = set()
    for it in req.items:
        food = foods.get(it.food_id)
        if food is None:
            raise KeyError(it.food_id)
        grams, assumed = to_grams(food, it.quantity, it.unit)
        level, reasons = confidence_for(food, it.source, assumed, it.match_confidence)
        if oil_lot and food.dish_type != "simple":
            level = _down(level)
            reasons.append("extra_oil")
        g_lo, g_hi = _rng(grams, level)
        groups = groups_for(food)
        meal_groups |= groups
        items.append(
            CheckItemOut(
                food=brief(food), quantity=it.quantity, unit=it.unit, grams=grams, grams_low=g_lo, grams_high=g_hi,
                assumed=assumed,
                portion_note="piece_weight_unknown" if piece_weight_unknown(food, it.quantity, it.unit) else None,
                confidence=level, confidence_reasons=reasons, groups=sorted(groups), tags=list(food.tags or []),
                source=food.source, method=food.method, verified=food.verified,
            )
        )  # fmt: skip
        rows.append((food, grams, level))

    if oil_lot:
        notes.append("extra_oil_not_counted")
    if req.answers.fried == "yes":
        meal_groups.add("fried")

    e_val, e_lo, e_hi, _ = _sum_nutrient(rows, "kcal")
    energy = Amount(value=round(e_val or 0), low=round(e_lo or 0), high=round(e_hi or 0), unit="kcal")
    refs = _ref_by_nutrient(profile.age if profile else None, profile.sex if profile else "unspecified")
    if not refs.get("energy") or refs["energy"].status != "sourced":
        notes.append("energy_target_pending")

    added_sugar = None
    if req.answers.sugar_spoons:
        # A teaspoon of sugar: existing household-unit conversion (FIXED_UNIT_GRAMS["tsp"]); estimate.
        added_sugar = AddedSugar(spoons=req.answers.sugar_spoons, grams=req.answers.sugar_spoons * C.FIXED_UNIT_GRAMS["tsp"])
        meal_groups.add("sugary_drink")
        notes.append("added_sugar_estimate")

    macros = []
    for code, (attr, unit) in MACROS.items():
        v, lo, hi, complete = _sum_nutrient(rows, attr)
        macros.append(NutrientLine(nutrient=code, unit=unit, value=v, low=lo, high=hi, complete=complete, status="known" if v is not None else "no_data"))

    get_enough = _get_enough(rows, refs)
    go_easy = _go_easy(rows, refs, energy.value)

    plate = {
        "grain": "grain" in meal_groups,
        "protein_food": "protein_food" in meal_groups,
        "veg_fruit": bool({"vegetable", "fruit"} & meal_groups),
        "dairy": "dairy" in meal_groups,
    }

    verdict = _verdict(rows, meal_groups, plate, go_easy, req)
    add_ons = _add_ons(foods, plate, req)
    swaps = _swaps(foods, [r[0] for r in rows], req)

    used = {}
    for food, _, _ in rows:
        key = food.source
        if key not in used:
            used[key] = SourceRef(kind="food", label=food.source, url=food.source_url, verified=food.verified, rows=0)
        used[key].rows += 1
    ref_sources = {r.url: r for r in refs.values() if r.status == "sourced" and r.url}
    sources = list(used.values()) + [
        SourceRef(kind="reference", label=r.source.split(":")[0], url=url, verified=True, rows=1) for url, r in ref_sources.items()
    ]

    return CheckResponse(
        teen=(profile.age <= 17) if profile else None,
        items=items, energy=energy, macros=macros, get_enough=get_enough, go_easy=go_easy,
        added_sugar=added_sugar, plate=plate, verdict=verdict, add_ons=add_ons, swaps=swaps,
        notes=notes, sources=sources, method_note=METHOD_NOTE,
    )  # fmt: skip


def _verdict(rows, groups: set[str], plate: dict[str, bool], go_easy: list[NutrientLine], req: CheckRequest) -> Verdict:
    reasons: list[VerdictReason] = []
    profile = req.profile
    diet = profile.diet if profile else "any"
    conflict = [f for f, _, _ in rows if not diet_ok(f, diet)]
    if conflict:
        reasons.append(VerdictReason(code="diet_conflict", kind="warn", food_ids=_brief_list(conflict)))
    if plate["veg_fruit"]:
        reasons.append(VerdictReason(code="has_veg", kind="good"))
    else:
        reasons.append(VerdictReason(code="add_veg", kind="tip"))
    wants_protein = req.meal_type in C.PROTEIN_MEALS or (profile is not None and profile.goal == "muscle")
    if plate["protein_food"]:
        reasons.append(VerdictReason(code="has_protein", kind="good"))
    elif wants_protein:
        reasons.append(VerdictReason(code="add_protein", kind="tip"))
    fried = [f for f, _, _ in rows if "fried" in groups_for(f)]
    if fried or "fried" in groups:
        reasons.append(VerdictReason(code="fried", kind="tip", food_ids=_brief_list(fried)))
    sweet_drinks = [f for f, _, _ in rows if "sugary_drink" in groups_for(f)]
    if sweet_drinks or "sugary_drink" in groups:
        reasons.append(VerdictReason(code="sugary_drink", kind="tip", food_ids=_brief_list(sweet_drinks)))
    for line in go_easy:
        if line.status == "above":
            reasons.append(VerdictReason(code=f"{line.nutrient}_above", kind="tip"))

    tips = sum(r.kind == "tip" for r in reasons)
    if conflict or tips >= C.VERDICT_CHANGE_AT_TIPS:
        level = "change"
    elif tips:
        level = "mostly"
    else:
        level = "fits"
    return Verdict(level=level, reasons=reasons)


def _add_ons(foods: dict[str, Food], plate: dict[str, bool], req: CheckRequest) -> list[Suggestion]:
    """Simple foods from missing groups that fit the diet. The app removes avoid-list foods."""
    diet = req.profile.diet if req.profile else "any"
    in_meal = {i.food_id for i in req.items}
    wanted: list[tuple[str, set[str]]] = []
    if not plate["veg_fruit"]:
        wanted.append(("add_veg", {"vegetable", "fruit"}))
    wants_protein = req.meal_type in C.PROTEIN_MEALS or (req.profile is not None and req.profile.goal == "muscle")
    if not plate["protein_food"] and wants_protein:
        wanted.append(("add_protein", {"protein_food"}))
    out: list[Suggestion] = []
    for reason, need in wanted:
        picks = [
            # Vegetables before fruit, then by id (stable order for the demo parity fixtures).
            f for f in sorted(foods.values(), key=lambda f: ("vegetable" not in groups_for(f), f.id))
            if f.id not in in_meal and need & groups_for(f) and diet_ok(f, diet)
            and not {"fried", "sweet", "starchy_root"} & groups_for(f)
            and f.category != "mixed_dish"  # an add-on is a side (dal, egg, shak), not another full dish
        ]  # fmt: skip
        out += [Suggestion(food=brief(f), reason=reason, tags=list(f.tags or [])) for f in picks[:4]]
    return out


def _swaps(foods: dict[str, Food], meal: list[Food], req: CheckRequest) -> list[Swap]:
    """For a fried item: a non-fried food of the same category that fits the diet."""
    diet = req.profile.diet if req.profile else "any"
    out: list[Swap] = []
    for f in meal:
        if "fried" not in groups_for(f):
            continue
        options = [
            o for o in sorted(foods.values(), key=lambda o: o.id)
            if o.id != f.id and o.category == f.category and "fried" not in groups_for(o) and diet_ok(o, diet)
            and "sweet" not in groups_for(o)
        ]  # fmt: skip
        if options:
            out.append(Swap(from_food=brief(f), to_food=brief(options[0]), reason="not_fried", to_tags=list(options[0].tags or [])))
    return out[:3]
