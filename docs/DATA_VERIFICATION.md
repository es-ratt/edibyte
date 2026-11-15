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

## Piece weights (`piece_grams`)

`piece_grams` is the weight of ONE piece, used when a user writes a count ("10ta fuchka", "2 biscuits").

- It is filled only where the existing serving already defines it (1 egg = the serving; 4 biscuits = serving / 4).
- It is **blank** for foods served by the plate, bowl, cup or pack: bhat, khichuri, biryani, polao, muri, jhal_muri, chira, dal, chola, gorur_mangsho, khasir_mangsho, shobji, shak, alu_vorta, alu_bhaji, salad, doi, mishti_doi, dudh, cha, rong_cha, dab, pepe, **fuchka**, chotpoti, chanachur, noodles.
- When it is blank and the user gives a piece count, the app does not guess: it uses one serving and asks the user to check.
- To fill it, weigh 10 pieces on a kitchen scale and enter the average. Fuchka and chotpoti matter most. Do not enter a number you did not weigh.

## Prices (optional, enables the budget swaps)

Fill `price_bdt_estimate`, `price_date` (YYYY-MM-DD) and `price_source` (for example a named market survey) **together**. Rows missing any of the three are ignored, so the app never shows a guessed price.

## Tips

Have a nutritionist or dietitian read `data/tips_seed.csv` and mark reviewed tips as verified.
