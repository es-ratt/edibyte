# Replacing the sample food table with sourced data

`backend/data/foods_seed.csv` has 48 foods. Every row is currently marked `verified=false` with the source "UNVERIFIED SAMPLE". The app shows this to users, and a reviewer will notice it. This is the most important data task before a final demo.

## Steps

1. For each row, look up the values **per 100 g edible portion** in a real source, for example:
   - the Food Composition Table for Bangladesh (INFS, University of Dhaka), or
   - USDA FoodData Central for foods it covers.
2. Update `kcal`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`.
3. Fill `source` (name of the table) and `source_url`, then set `verified` to `true` **only for rows you actually checked**.
4. Re-import: `cd backend && python -m app.scripts.import_foods data/foods_seed.csv`
5. Run `python -m pytest -q` and `python -m eval.run`.

## Prices (optional, enables the budget swaps)

Fill `price_bdt_estimate`, `price_date` (YYYY-MM-DD) and `price_source` (for example a named market survey) **together**. Rows missing any of the three are ignored, so the app never shows a guessed price.

## Tips

Have a nutritionist or dietitian read `data/tips_seed.csv` and mark reviewed tips as verified.
