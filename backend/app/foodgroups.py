"""Food-group flags derived from a food's category, tags and dish type.

This is classification, not nutrition data: it decides which habit a food counts towards
(vegetables, protein food, fried, sugary drink...). Keep every rule here so a dietitian can review
it in one place. Iron/zinc/calcium "source" flags are NOT set: they need composition data we do not
have yet (they would be claims, not classifications).
"""

from __future__ import annotations

from .models import Food
from .nutrition_config import COUNT_STARCHY_ROOTS_AS_VEGETABLE

STARCHY_ROOT_IDS = {"alu_vorta", "alu_bhaji"}

GROUPS = (
    "grain", "protein_food", "vegetable", "fruit", "dairy", "starchy_root", "fried", "sugary_drink",
    "sweet", "street_food", "packaged_snack", "drink",
)  # fmt: skip


def groups_for(food: Food) -> set[str]:
    tags = set(food.tags or [])
    cat = food.category
    out: set[str] = set()
    if cat == "grain" or "grain" in tags or "staple" in tags:
        out.add("grain")
    # Meat, fish, egg and lentil dishes count as a protein food even without a "protein" tag (biryani).
    if {"protein", "meat", "fish", "egg", "lentil"} & tags or cat in {"meat", "fish", "egg", "lentil"}:
        out.add("protein_food")
    if food.id in STARCHY_ROOT_IDS:
        out.add("starchy_root")
        if COUNT_STARCHY_ROOTS_AS_VEGETABLE:
            out.add("vegetable")
    elif cat == "vegetable" or "vegetable" in tags:
        out.add("vegetable")
    if cat == "fruit" or "fruit" in tags:
        out.add("fruit")
    if "dairy" in tags:
        out.add("dairy")
    if "fried" in tags:
        out.add("fried")
    if "sweet" in tags:
        out.add("sweet")
    if cat == "drink" or "drink" in tags:
        out.add("drink")
        if "sweet" in tags:
            out.add("sugary_drink")
    if food.dish_type == "street":
        out.add("street_food")
    if food.dish_type == "packaged":
        out.add("packaged_snack")
    return out


def diet_ok(food: Food, diet: str) -> bool:
    tags = set(food.tags or [])
    if diet == "vegetarian":
        return "vegetarian" in tags
    if diet == "no_beef":
        return "beef" not in tags
    return True
