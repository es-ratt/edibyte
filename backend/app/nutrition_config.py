"""All constants used by the deterministic nutrition rules engine.

Keep every number the engine depends on in this one file so the team (and
judges) can review and change them in one place. Values are general,
conservative adult guidelines, not personalised medical prescriptions.
"""

import os

# --- Energy (Mifflin-St Jeor, 1990) -----------------------------------------
# BMR = 10*weight_kg + 6.25*height_cm - 5*age + SEX_OFFSET
MIFFLIN_SEX_OFFSET = {
    "male": 5,
    "female": -161,
    # Used when the user prefers not to say: midpoint of the two offsets.
    "unspecified": -78,
}

# Total daily energy = BMR * activity factor (commonly used multipliers).
ACTIVITY_FACTORS = {
    "sedentary": 1.2,  # desk work, little exercise
    "light": 1.375,  # light exercise 1-3 days/week
    "moderate": 1.55,  # moderate exercise 3-5 days/week
    "active": 1.725,  # hard exercise 6-7 days/week
    "very_active": 1.9,  # physical job plus training
}

# Goal adjustment applied to maintenance calories. Deliberately mild.
GOAL_CALORIE_MULTIPLIER = {
    "lose": 0.85,  # ~15% deficit
    "maintain": 1.0,
    "gain_muscle": 1.10,  # ~10% surplus
}

# Conservative calorie floor: targets are NEVER returned below this.
# Override with MIN_KCAL_FLOOR_MALE / MIN_KCAL_FLOOR_FEMALE env vars.
MIN_KCAL_FLOOR = {
    "male": int(os.getenv("MIN_KCAL_FLOOR_MALE", 1500)),
    "female": int(os.getenv("MIN_KCAL_FLOOR_FEMALE", 1200)),
    "unspecified": int(os.getenv("MIN_KCAL_FLOOR_UNSPECIFIED", 1500)),
}

# --- Macronutrients ----------------------------------------------------------
# Protein grams per kg body weight per day, by goal.
PROTEIN_G_PER_KG = {
    "lose": 1.2,  # higher protein helps keep muscle in a deficit
    "maintain": 1.0,
    "gain_muscle": 1.6,
}

FAT_ENERGY_SHARE = 0.28  # 28% of calories from fat
KCAL_PER_G_PROTEIN = 4
KCAL_PER_G_CARB = 4
KCAL_PER_G_FAT = 9
FIBER_TARGET_G = 25  # general adult guideline

# Accepted input ranges for the profile form (adults only).
PROFILE_LIMITS = {
    "age": (18, 80),
    "height_cm": (120, 220),
    "weight_kg": (30, 200),
}

# --- Tip rules (per single meal, as a share of the daily target) ------------
MEAL_LARGE_KCAL_SHARE = 0.45  # one meal above 45% of the day is "large"
MEAL_LOW_PROTEIN_SHARE = 0.20  # meal protein below 20% of daily target
HIGH_CARB_ENERGY_SHARE = 0.65  # >65% of meal energy from carbohydrate
LOW_FIBER_PER_MEAL_G = 5

# --- Units -------------------------------------------------------------------
# Fixed-weight units (grams per unit). Container/count units such as plate,
# bati, cup, glass, piece and "ta" are treated as ONE standard serving of that
# specific food (Food.serving_grams), because a plate of rice and a piece of
# egg weigh very different amounts.
FIXED_UNIT_GRAMS = {
    "g": 1.0,
    "kg": 1000.0,
    "ml": 1.0,  # approximation: 1 ml ~ 1 g for drinks
    "l": 1000.0,
    "tbsp": 15.0,
    "tsp": 5.0,
}
SERVING_UNITS = {"serving", "plate", "bati", "cup", "glass", "piece", "slice", "handful"}
