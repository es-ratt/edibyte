# Weighed-meal validation

How the team measures EdiByte's real accuracy. The results replace the old 34-meal parser check (which is only a regression test) on the Data page and in the README.

## What it measures

| Metric | How |
|---|---|
| Food identification | Precision, recall and F1 of the food ids the app found vs the foods really on the plate |
| Energy, protein, sodium, sugar | Mean absolute error and mean relative error of the app's estimate vs the weighed truth |
| Failures | Every meal with a missed or extra food, or an estimate more than 30% off, listed by id |

Nutrients the app has no data for yet (for example sodium) are **not compared**, and the results say how many meals each metric is based on. Nothing is filtered or tuned.

## Collecting a meal (about 5 minutes)

1. **Before eating**, weigh each component separately on a kitchen scale (grams). Note oil or sugar added if you can.
2. Photograph the whole plate from above in good light.
3. Write the truth: food ids (from `backend/data/foods_seed.csv`) and weighed grams.
4. Write the nutrient truth from a **cited** source: food composition table rows (name the table and row) or the pack label. Leave a cell empty if you have no cited value. Never estimate the truth.
5. Run the app on the photo (or the typed meal), confirm nothing, and copy what it identified and the grams it used.

Aim for **100+ meals**, including street food (fuchka, singara, chotpoti), fast food and packaged snacks, at homes, canteens and hostels. Keep 20% of the meals aside as a held-out set that nobody looks at while improving the app.

## Recording

Add one row per meal to `backend/eval/weighed_meals.csv`:

| Column | Example |
|---|---|
| `meal_id` | `m001` |
| `date` | `2026-11-25` |
| `photo_file` | `m001.jpg` (keep photos outside the repo; they may show people) |
| `true_food_ids` / `true_grams` | `bhat\|dal` / `287\|142` |
| `app_food_ids` / `app_grams` | `bhat\|dal` / `250\|150` |
| `true_energy_kcal`, `true_protein_g`, `true_sodium_mg`, `true_sugar_g` | numbers from the cited source, or empty |
| `truth_source` | `FCT Bangladesh 2013 rows 12, 48` |
| `notes` | anything unusual |

## Running

```bash
cd backend
python -m eval.validate_weighed eval/weighed_meals.csv
```

This writes `backend/eval/validation_results.json`. The API serves it at `GET /eval/validation` and the Data page shows it. Commit the CSV and the results together, and report them in the README exactly as produced, failures included.

## Privacy

No names, faces or health details in the CSV. Photos stay on the team's own storage.
