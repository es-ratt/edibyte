<div align="center">

# 🥗 EdiByte

### Bangla-first AI nutrition coach for everyday food in Bangladesh

**Team Qbits** · International AI Builders Congress 2026 · Domain: FoodSphere AI · Challenge: Nutrition Intelligence

</div>

> EdiByte gives general nutrition information only. It is not medical advice.

---

## Overview

People in Bangladesh describe meals the way they talk: *“ek plate bhat, dal ar ekta dim”*,
*“এক প্লেট ভাত আর মাছের ঝোল”*, or *“rice with chicken curry”*. Most nutrition apps expect
English and Western foods. EdiByte lets you type a meal in **Bangla, English, Banglish or a mix**:

1. **Understand.** An LLM (or offline rules when there is no API key) extracts food names and
   amounts only.
2. **Look up.** Each item is fuzzy-matched to a **food table** (Bangla, English and Banglish
   aliases), and quantities like *plate, bati, ta, piece, spoon, gram* are converted to grams.
3. **Review.** The user checks and edits every item, and unknown foods are shown, never dropped.
4. **Report.** A **deterministic rules engine** computes calories, protein, carbs, fat and fibre
   against personal daily targets (Mifflin-St Jeor), then picks 2-3 tips.
5. **Coach.** A RAG chat (BM25 over foods and tips) answers in the user's language style, with
   source chips and a disclaimer.

**Nutrition numbers never come from the LLM.** The LLM output is validated with Pydantic, which
rejects any extra field such as `kcal`.

## Implementation status

Legend: ✅ working · 🧪 working, but with sample/demo data · 🚩 built behind a feature flag (off) · 🗓️ planned

| Area | Status | Notes |
|---|---|---|
| Meal parsing: Bangla, Banglish, English, mixed (offline rules) | ✅ | Bangla digits, number words (*duita, দুইটা, half*), postfix amounts (*ruti 2ta*) |
| Meal parsing with an LLM (Gemini / Claude / OpenAI) | ✅ | Strict JSON, retry once on invalid output, falls back to offline. Tested with a mocked provider only, no live key used during development |
| Fuzzy matching to the food table + unmatched list | ✅ | rapidfuzz, Bangla suffix stripping, multi-food phrase splitting |
| Food table (48 foods) | 🧪 | **All rows are UNVERIFIED SAMPLE placeholders.** Must be replaced with sourced data |
| Tips table (15 tips, bn/en/banglish) | 🧪 | Unverified, team-written |
| Nutrition report: totals, targets, % of target, rule-based tips | ✅ | Constants in `backend/app/nutrition_config.py`, calorie floor enforced |
| Personal targets + 2 demo profiles | ✅ | Demo profiles are fictional |
| RAG coach with sources (AI mode) | ✅ | Prompt-injection-safe delimited data blocks. Not tested against a live LLM |
| Coach offline template answers | ✅ | Labelled "offline mode" |
| Guardrails (medical, pregnancy, extreme dieting) | ✅ | Keyword-based, tested |
| Budget swaps in ৳ | ✅ / 🧪 | Logic works and is tested, but **no price data exists yet**, so the UI says so. Prices are never guessed |
| Photo input | 🚩 | `ENABLE_PHOTO=false` by default, needs a vision-capable model. Not tested with a live model |
| Evaluation harness | ✅ | 34 team-made meals, see [Evaluation](#evaluation) |
| Frontend: Home, Log → Review → Report, Coach, Profile, 6 About pages | ✅ | Mobile-first, 3 languages, olive theme |
| Rate limiting, privacy ("clear my data"), logs without user text | ✅ | In-memory rate limit (single instance) |
| Verified dataset, real prices, meal history, voice input, PWA | 🗓️ | See `/roadmap` in the app |

## Architecture

```
┌──────────────── frontend (React + Vite + TS + Tailwind) ────────────────┐
│ Home · Log → Review → Report · Coach · Profile · About pages            │
│ i18n (bn / en / banglish) · /health ping + cold-start notice · AI/offline badge
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ JSON over HTTPS (VITE_API_BASE_URL)
┌───────────────────────────────▼──────── backend (FastAPI) ───────────────┐
│ /meal/parse ── normalise → extract (LLM JSON │ rule-based) → match (rapidfuzz) → grams
│ /meal/report ─ rules engine (Mifflin-St Jeor, floor, tips, swaps) ◄── Food table
│ /coach ─────── guardrails → BM25 (foods + tips, alias-aware) → LLM │ template
│ llm.py: gemini | anthropic | openai | none  (model + key from env only)  │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ SQLModel
                     SQLite (local) / PostgreSQL (Supabase, Neon)
```

Key backend files: `app/parser.py` (extraction), `app/matcher.py` (fuzzy matching),
`app/units.py` (grams), `app/rules.py` + `app/nutrition_config.py` (rules engine),
`app/retrieval.py` + `app/coach.py` (RAG), `app/guardrails.py`, `app/llm.py`.

## Data sources and licence notes

- `backend/data/foods_seed.csv`: 48 common Bangladeshi foods. **Every row has `verified=false` and
  `source="UNVERIFIED SAMPLE - team must replace with sourced data"`.** The values are rough
  placeholders written by the team for the demo. They are not from a published table and must not
  be presented as accurate. Nutrients are **per 100 g edible portion**. `price_bdt_estimate` is
  blank everywhere: no prices were invented.
- `backend/data/tips_seed.csv`: 15 short general tips in Bangla, English and Banglish, also
  `verified=false`.
- **Candidate sources (planned, licence/terms to be checked before use):** Food Composition Table
  for Bangladesh (Institute of Nutrition and Food Science, University of Dhaka) for nutrients, and
  government market price lists (for example TCB daily prices) for dated Taka prices.
- When importing real data, fill `source`, `source_url`, `price_date` and `price_source`, and set
  `verified=true` only for rows checked against the source. The UI shows an **Unverified** badge for
  every `verified=false` row, and the `/data` page reads the verification status live from the DB.

Replace or update data (upserts by `id`):

```bash
cd backend
python -m app.scripts.import_foods data/foods_seed.csv          # foods
python -m app.scripts.import_foods data/tips_seed.csv --tips    # tips
```
Restart the backend afterwards so the in-memory search indexes are rebuilt.

## How to run locally

Requirements: Python 3.11+ and Node 20+ with pnpm (`corepack enable pnpm`, or `npm i -g pnpm`).

**Terminal 1 (backend)**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # optional: add an LLM key for AI mode
uvicorn app.main:app --reload --port 8000
```
The database is created and seeded automatically on first start. Check `http://localhost:8000/health`
(and `http://localhost:8000/docs` for the interactive API docs).

**Terminal 2 (frontend)**
```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```
Open `http://localhost:5173`.

### AI mode vs offline mode

With no key, the app runs in **offline mode**: rule-based parsing and template coach answers.
The whole demo works this way. To enable AI mode, set these in `backend/.env`:

```
LLM_PROVIDER=gemini        # or anthropic, openai
LLM_MODEL=<model id for that provider>
LLM_API_KEY=<your key>
```
Model names are never hardcoded. Keys live only on the backend. If an LLM call fails, that request
falls back to offline mode and the UI says so.

### Mock mode (UI work without a backend)
Set `VITE_USE_MOCK_DATA=true` in `frontend/.env.local`. A banner marks every page as mock data.

## Tests and build

```bash
cd backend && source .venv/bin/activate && pytest -q     # parser, matching, rules, guardrails, LLM fallback
cd frontend && pnpm build                                  # type-check + production build
```

## Evaluation

`backend/eval/meals_test.jsonl` holds **34 team-made test meals**: 10 Bangla, 10 Banglish, 10 English
and 4 mixed, each with its expected foods. To run it:

```bash
cd backend && python -m eval.run
```
This writes `eval/results.json` with a timestamp and mode. The `/impact` page shows it, or
"Not run yet" if the file is missing.

**Honest caveats:** the set is small, written by the team, and was used *while building* the
matcher (one alias, "chickpea curry", was added after the eval caught it matching chicken). It is
not an independent benchmark, so the current offline score (all 34 meals matched) is optimistic.
It measures food identification only, not portion size or nutrient accuracy. A held-out set
written by people outside the team is planned.

## Deployment

`render.yaml` defines both services for Render: the API as a Python web service and the frontend
as a static site. `backend/Procfile` works for Railway or Heroku-style hosts. Set `DATABASE_URL`
to a PostgreSQL URL (Supabase or Neon; `postgres://` URLs are accepted), `CORS_ORIGINS` to the
frontend URL, and optionally the `LLM_*` variables. Free tiers sleep when idle, and the frontend
shows a "Starting up, one moment" notice while `/health` wakes the server.

## Responsible AI and privacy

- No accounts and no real health data. The profile lives in the browser (localStorage).
- Meal logs keep only food ids and grams under an anonymous id. `DELETE /session/data` (the
  "Clear my data" button) removes them.
- Logs never contain user text unless `LOG_USER_TEXT=true`.
- Guardrails redirect medical, pregnancy and extreme-dieting questions to a doctor or dietitian.
- Calorie targets never go below a configurable floor (`MIN_KCAL_FLOOR_*`).
- Retrieved rows and user text go to the LLM inside delimited data blocks, with instructions to
  treat them as data, not instructions.

## API

See **[API_CONTRACT.md](API_CONTRACT.md)**.

## Project structure

```
backend/   FastAPI app (app/), seed CSVs (data/), eval harness (eval/), tests (tests/)
frontend/  React app: src/{components,pages,services,types,hooks,lib}
docs/      early prototype
```

## Team Qbits

Team Leader / Coordinator · Business Analyst / Data Scientist · UI/UX / Frontend Developer ·
Backend / Data Engineer · Presentation / Communication Lead. Add names in `frontend/src/lib/team.ts`.
