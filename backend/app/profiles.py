"""Demo profiles. Fictional people for demos only; no real health data."""

from .schemas import DemoProfile, Profile

DEMO_PROFILES: list[DemoProfile] = [
    DemoProfile(
        id="student_budget",
        name_bn="বাজেটে চলা শিক্ষার্থী",
        name_en="Student on a budget",
        name_bl="Budget e chola student",
        description_en="Fictional university student, maintaining weight, daily food budget 150 Taka.",
        profile=Profile(
            goal="maintain", sex="female", age=21, height_cm=157, weight_kg=50, activity="light",
            diet="any", daily_budget_bdt=150,
        ),  # fmt: skip
    ),
    DemoProfile(
        id="muscle_gain",
        name_bn="পেশি বাড়াতে চাই",
        name_en="Muscle gain",
        name_bl="Muscle barate chai",
        description_en="Fictional young adult who trains 5 days a week and wants to build muscle.",
        profile=Profile(
            goal="gain_muscle", sex="male", age=24, height_cm=172, weight_kg=68, activity="active",
            diet="any", daily_budget_bdt=300,
        ),  # fmt: skip
    ),
]
