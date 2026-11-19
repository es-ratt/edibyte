<div align="center">

# EdiByte

### Is this meal right for me? Nutrition guidance for Bangladeshi teens

Take a photo of your meal, confirm the foods, and see how it fits **your** goal, with honest ranges, sources and confidence on every number.

<a href="https://es-ratt.github.io/edibyte/"><img alt="Open the live demo" src="https://img.shields.io/badge/%E2%96%B6%20Live%20demo-es--ratt.github.io%2Fedibyte-4F6B2A?style=for-the-badge"></a>

[![CI](https://github.com/es-ratt/edibyte/actions/workflows/ci.yml/badge.svg)](https://github.com/es-ratt/edibyte/actions/workflows/ci.yml)
[![Deploy](https://github.com/es-ratt/edibyte/actions/workflows/deploy-frontend.yml/badge.svg)](https://github.com/es-ratt/edibyte/actions/workflows/deploy-frontend.yml)
![React 19](https://img.shields.io/badge/React-19-4F6B2A?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.12-4F6B2A?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-offline%20ready-4F6B2A?style=flat-square)
![Languages](https://img.shields.io/badge/UI-বাংলা%20%7C%20English%20%7C%20Banglish-E0A526?style=flat-square)
[![License: MIT](https://img.shields.io/badge/License-MIT-2F3E1A?style=flat-square)](LICENSE)

**Team Qbits** · International AI Builders Congress 2026 · *Idea to Unicorn* · Challenge: **Nutrition Intelligence**

</div>

---

## Try it now

| | |
|---|---|
| **Live demo** | **[es-ratt.github.io/edibyte](https://es-ratt.github.io/edibyte/)**, works on any phone or laptop, no sign-up |
| **What runs there** | The full app in **demo mode**: the real rules engine runs in your browser on the project's food table. A yellow "Demo data" banner is always shown. |
| **Try this** | Choose a language → enter a birth year (try an age under 18 to see teen mode) → tap **Photo** → pick any image from your gallery (the demo always recognises a sample meal) **or** type `bhat dal shak` → confirm → see the result → **Ask the coach** → open **Progress** and **Plans**. |
| **Backend API** | Not deployed yet. One-click setup on Render from this repo: see [DEPLOY.md](DEPLOY.md). |

> **Honest status.** All 48 foods in the current table are **unverified team estimates**, labelled as such in the app. Nutrients we do not have yet (sugar, sodium, saturated and trans fat, iron, zinc, calcium) are shown as *"not in our data yet"*, never guessed. EdiByte gives general nutrition information, **not medical advice**.

---

## Contents

1. [Why EdiByte](#why-edibyte)
2. [Screenshots](#screenshots)
3. [Features](#features)
4. [How it works](#how-it-works)
5. [Trust model](#trust-model)
6. [Teen safety by design](#teen-safety-by-design)
7. [Architecture](#architecture)
8. [Tech stack](#tech-stack)
9. [Project structure](#project-structure)
10. [Getting started](#getting-started)
11. [API](#api)
12. [Testing and quality](#testing-and-quality)
13. [Deployment](#deployment)
14. [Data and sources](#data-and-sources)
15. [Roadmap](#roadmap)
16. [Team](#team)
17. [License](#license)

---

## Why EdiByte

Bangladeshi teenagers eat a mix of traditional home food (bhat, dal, shak, mach) and street, fast and packaged food (fuchka, singara, burgers, soft drinks). Most nutrition apps are built for Western foods, English and adult weight loss, and they hide how uncertain their numbers are.

EdiByte answers one everyday question, *"is this meal right for my diet and goal?"*, in **Bangla, English or Banglish**, with three promises:

- **Verified data, not AI guesses.** Every number comes from a food table or a cited guideline. The AI only names foods; it never produces nutrition numbers.
- **Honest ranges.** Every amount shows a range and a confidence level. A photo can never be exact, so the app never pretends it is.
- **The user confirms.** Nothing is calculated until the user has checked the foods and portions.

---

## Screenshots

<table>
<tr>
<td align="center"><img src="docs/screenshots/welcome.png" width="220" alt="Welcome (Bangla first)"><br><sub>Welcome (Bangla first)</sub></td>
<td align="center"><img src="docs/screenshots/home.png" width="220" alt="Home: photo, week dots, today's plan"><br><sub>Home: photo, week dots, today's plan</sub></td>
<td align="center"><img src="docs/screenshots/confirm.png" width="220" alt="Confirm foods and portions"><br><sub>Confirm foods and portions</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/screenshots/result.png" width="220" alt="Verdict and plate balance"><br><sub>Verdict and plate balance</sub></td>
<td align="center"><img src="docs/screenshots/result-nutrients.png" width="220" alt="Range, confidence, source"><br><sub>Range, confidence, source</sub></td>
<td align="center"><img src="docs/screenshots/result-bangla.png" width="220" alt="Full Bangla support"><br><sub>Full Bangla support</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/screenshots/coach.png" width="220" alt="Coach with meal context"><br><sub>Coach with meal context</sub></td>
<td align="center"><img src="docs/screenshots/coach-safe.png" width="220" alt="Safe answer for health topics"><br><sub>Safe answer for health topics</sub></td>
<td align="center"><img src="docs/screenshots/progress.png" width="220" alt="Weekly habits and suggestion"><br><sub>Weekly habits and suggestion</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/screenshots/plans.png" width="220" alt="Day plan pre-check"><br><sub>Day plan pre-check</sub></td>
<td align="center"><img src="docs/screenshots/data.png" width="220" alt="Every source with a link"><br><sub>Every source with a link</sub></td>
<td align="center"><img src="docs/screenshots/guidance.png" width="220" alt="WHO guidance, rest pending review"><br><sub>WHO guidance, rest pending review</sub></td>
</tr>
</table>

---

## Features

| Area | What it does | Status |
|---|---|---|
| **Profile** | Birth year and month, sex, optional height/weight, activity with Bangladeshi examples, teen-safe goals, diet (any / vegetarian / no beef), allergy avoid-list, meals per day, where you eat, fasting, optional budget. Stored only on the phone. | Built |
| **Teen mode** | Automatic under 18: no weight-loss goals, no calorie headline, no scores or streaks, weight never shown, notifications off. | Built |
| **Photo → confirm** | Camera or gallery, client-side resize (drops EXIF, photo never stored), foods named by AI only, "not sure" highlight, household portions, unmatched foods never dropped, questions a photo cannot answer (oil, fried, sugar spoons). | Built |
| **Meal result** | Gentle verdict, plate balance, "get enough" / "go easy" with range bars, confidence and source chips, add-ons and swaps that respect diet and avoid-list, "I can't verify allergens". | Built |
| **Coach** | Follow-up questions with the meal as context; answers only from foods, tips and WHO rows, with citations; number post-check on AI answers; safe answers for health topics; voice input where supported. | Built |
| **Progress** | Week (main), month and year views of food-group habits, "based on X of Y meals", one rule-chosen weekly suggestion with source. | Built |
| **Plans** | Day plan with pre-check by the same engine, week goals (max 3) with treat days and "5 of 7 is a win", month focus with check-ins and review. | Built |
| **Safety and privacy** | Pause tracking, hide numbers, delete all data, wellbeing check-in placeholder, support card, privacy card, anonymous usage switch. | Built |
| **Data and sources** | Verified vs unverified counts, every WHO reference with link and date, accuracy status, report a mistake. | Built |
| **Measurement** | Anonymous adoption events, protected impact summary, weighed-meal validation script. | Built (no results yet) |

---

## How it works

```mermaid
sequenceDiagram
    autonumber
    actor Teen
    participant App as EdiByte app (phone)
    participant API as FastAPI backend
    participant LLM as Vision model (optional)
    participant Data as Food table + reference CSV

    Teen->>App: Take or pick a photo
    App->>App: Resize to 1280 px JPEG, drop EXIF
    App->>API: POST /meal/parse-image
    API->>LLM: "Name the foods" (names + rough portions only)
    LLM-->>API: ["bhat", "dal", "dim bhaji"]
    API->>Data: Match names to food ids
    API-->>App: Foods + match confidence
    Teen->>App: Confirm foods, portions, oil / fried / sugar
    App->>API: POST /meal/check (food ids, grams, answers, profile summary)
    API->>Data: Per-100 g values, sourced targets and limits
    API-->>App: Ranges, confidence, verdict, sources
    App-->>Teen: Result in Bangla, English or Banglish
    Note over App: Saved only on the phone (IndexedDB)
```

Without an AI key, photos fall back to typing (`bhat 300g dal 200ml`); the rule-based parser handles Bangla, English and Banglish, counts (`2ta`), household units and negation (`bhat chara`).

---

## Trust model

Every number on screen follows the same path. The language model is kept out of it.

```mermaid
flowchart LR
    subgraph AI["AI (optional)"]
        V["Vision / LLM<br/>names foods only"]
    end
    subgraph User["User"]
        C["Confirms foods<br/>and portions"]
    end
    subgraph Engine["Deterministic rules engine"]
        G["grams = portion x serving<br/>or piece weight"]
        N["nutrient = per-100 g value x grams"]
        R["range from confidence<br/>High / Medium / Low"]
    end
    subgraph Sources["Cited data"]
        F[("Food table<br/>source, method, verified")]
        T[("reference_targets.csv<br/>WHO, URL, date")]
    end
    V --> C --> G --> N --> R
    F --> N
    T --> R
    R --> S["Shown with source chip,<br/>confidence chip and range"]
```

| Rule | How it is enforced |
|---|---|
| The LLM never produces numbers | Its JSON schema only allows names and rough portions (`extra="forbid"`); numbers come from `check.py`. |
| Unknown is not zero | Missing nutrients are `null` and shown as "not in our data yet". |
| `verified` needs proof | A row is verified only with a source URL, a reviewer and a check date. |
| Targets need a source | Every target and limit lives in `backend/data/reference_targets.csv` with source, URL and date; empty rows show "pending expert review". |
| Two kinds of percentages | "% of your daily target" (things to get enough of) vs "share of this meal's energy" or "% of your daily limit" (things to go easy on). |

**Confidence levels:** simple foods start *High*; mixed dishes, street, restaurant and packaged food start *Low*; unverified data is capped at *Medium*; photo portions, assumed portions and unsure matches lower it further.

---

## Teen safety by design

Research links diet-tracking apps, especially tracking for weight or shape and frequent use, with more disordered-eating symptoms in young people, and adolescents are under-researched. EdiByte is built around that:

```mermaid
flowchart TD
    A[Profile saved] --> B{Age under 18?}
    B -- yes --> T[Teen mode ON, locked]
    B -- no --> O[Adult can opt in]
    T --> T1[No weight-loss goal or calorie deficit]
    T --> T2[No calorie headline, no scores, no streaks]
    T --> T3[Weight never shown on screen]
    T --> T4[Weekly view first, missed days are fine]
    T --> T5["Weight worries: talk to a doctor or dietitian"]
    W[Wellbeing check-in flagged] --> H[Hide tracking + show support card]
```

Also: no "bad food" wording, amber (never red) for limits, terracotta only for allergy and medical notices, an avoid-list that is clearly *not* an allergy guarantee, and a check-in whose questions must come from a qualified reviewer (none are invented by engineers).

---

## Architecture

```mermaid
flowchart TB
    subgraph Phone["User's phone (PWA)"]
        UI["React 19 app<br/>bn / en / banglish"]
        IDB[("IndexedDB<br/>profile, meals, plans")]
        DEMO["Demo adapter<br/>same engine, same CSVs"]
        UI <--> IDB
        UI -. no backend .-> DEMO
    end
    subgraph Server["FastAPI backend (Render)"]
        P["Parser + matcher"]
        CK["Check engine"]
        RF["Reference provider"]
        CO["Coach (BM25 + guardrails)"]
        DB[("Postgres or SQLite<br/>seeded from CSV")]
    end
    LLM["LLM provider<br/>Gemini / Claude / OpenAI<br/>(optional)"]
    CSV[("backend/data/*.csv<br/>foods, tips, reference targets")]

    UI -- HTTPS --> P & CK & RF & CO
    P -. names only .-> LLM
    CO -. reword only .-> LLM
    CSV --> DB
    CSV -. imported at build .-> DEMO
    P & CK & RF & CO --> DB
```

- **Local-first.** Profile, meals and plans stay on the device. The server receives only what it needs: food ids, grams, answers and a profile *summary* (age, sex, activity, goal, diet), never the birth date, weight or avoid-list.
- **One source of truth.** The demo adapter imports the same CSV files as the API. A TypeScript port of the check engine is verified against fixtures produced by the Python engine; any drift fails CI.
- **Offline.** The app shell, fonts and icons are cached by a service worker; nutrition answers are never cached.

---

## Tech stack

| Layer | Technology |
|---|---|
| Web app | React 19, TypeScript, Vite 8, Tailwind CSS 4 (design tokens), React Router 7, Zustand, `idb`, `vite-plugin-pwa`, Lucide icons, Hind Siliguri + Inter (self-hosted) |
| Backend | Python 3.12, FastAPI, SQLModel, rapidfuzz (matching), rank-bm25 (coach retrieval), httpx |
| AI (optional) | Provider-agnostic: Gemini, Anthropic Claude or OpenAI, configured by environment variables |
| Data | CSV files in `backend/data/` imported into SQLite (local) or Postgres (deploy) |
| Testing | pytest, Vitest, Testing Library, golden-fixture parity tests, headless-browser click-through |
| CI/CD | GitHub Actions (ruff, pytest, typecheck, Vitest incl. axe accessibility, build, bundle budget, Playwright e2e), GitHub Pages (frontend), Render (API) |

---

## Project structure

```text
edibyte/
├── frontend/                 # PWA (deployed to GitHub Pages)
│   └── src/
│       ├── app/              # router, layout, store
│       ├── routes/           # Welcome, Onboarding, Home, Capture, Confirm, Result, Coach, Progress, Plans, Settings, Data
│       ├── features/         # profile, capture, report, progress, plans, safety
│       ├── lib/
│       │   ├── api/          # Api interface, live client, demo adapter
│       │   ├── check/        # demo engine (port of check.py) + parity fixtures
│       │   ├── coach/        # coach types + demo coach
│       │   ├── plans/        # day / week / month plan rules
│       │   ├── progress/     # habit metrics + weekly suggestion rules
│       │   ├── db/           # IndexedDB
│       │   ├── i18n/         # bn (source) / en / banglish
│       │   └── targets/      # reference targets
│       └── styles/           # design tokens with measured contrast
├── backend/
│   ├── app/                  # FastAPI: parser, matcher, check engine, reference, coach, suggestions, analytics
│   ├── data/                 # foods_seed.csv, reference_targets.csv, tips.csv, tips_seed.csv
│   ├── eval/                 # parser regression set, demo fixtures, weighed-meal validation
│   └── tests/                # pytest
├── legacy-frontend/          # Previous app (archived, not built or deployed)
├── docs/                     # REBUILD_PLAN.md, DATA_VERIFICATION.md, VALIDATION.md, screenshots
├── PITCH.md
├── API_CONTRACT.md
├── DEPLOY.md
└── render.yaml
```

---

## Getting started

**Requirements:** Python 3.12, Node.js 22, pnpm 10.

**Terminal 1: backend**
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows; on macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000/docs
```

**Terminal 2: frontend**
```bash
cd frontend
cp .env.example .env.local      # VITE_API_BASE_URL=http://localhost:8000
pnpm install
pnpm dev                        # http://localhost:5173
```

Leave `VITE_API_BASE_URL` empty to run the frontend alone in demo mode.

**Optional AI mode** (`backend/.env`):

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `gemini`, `anthropic`, `openai` or `none` (default) |
| `LLM_MODEL`, `LLM_API_KEY` | Model id and key (backend only, never in the web app) |
| `ENABLE_PHOTO` | `true` to accept photos (needs AI mode) |
| `DATABASE_URL` | Postgres URL; blank = local SQLite |
| `CORS_ORIGINS` | Allowed web origins |
| `TRUST_PROXY` | `true` only behind a trusted proxy (Render) |
| `IMPACT_KEY` | Secret that turns on `GET /impact/summary`; empty = off |

---

## API

Interactive docs at `/docs` when the backend runs. Full contract: [API_CONTRACT.md](API_CONTRACT.md).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Status, mode (AI or offline), photo flag |
| `POST` | `/meal/parse` | Text → foods (names, amounts, match confidence, unmatched with suggestions) |
| `POST` | `/meal/parse-image` | Photo → foods (vision model names foods only; photo not stored) |
| `POST` | `/meal/check` | Confirmed foods + answers + profile summary → ranges, sections, verdict, sources |
| `POST` | `/meal/plan-check` | A planned day checked slot by slot before eating |
| `GET` | `/reference/targets` | Sourced targets and limits for an age and sex, or "unavailable" |
| `POST` | `/suggestions` | Habit counts → one rule-chosen weekly tip |
| `GET` | `/foods?query=` | Food search |
| `POST` | `/coach` | Questions with meal context, citations, number post-check and safety guardrails |
| `POST` | `/events`, `/feedback/item` | Anonymous adoption events (names + numbers), wrong-item taps (food ids) |
| `GET` | `/impact/summary` | Protected adoption and habit-change summary (off without `IMPACT_KEY`) |
| `GET` | `/eval/validation` | Weighed-meal validation results or "not measured" |
| `GET` | `/data/status` | Verified vs unverified counts by source |
| `DELETE` | `/session/data` | Delete anonymous server-side meal logs |

---

## Testing and quality

```bash
cd backend && ruff check . && python -m pytest -q
cd frontend && pnpm typecheck && pnpm test && pnpm build && pnpm size
cd frontend && PW_CHANNEL=msedge pnpm e2e      # CI uses Chromium
```

| Suite | Result | Covers |
|---|---|---|
| Backend (pytest) | **137 passing** | Parser and matcher (regression tests for every fixed bug), check engine, plan check, reference targets, coach (guardrails, citations, number post-check, teen rules), suggestions, events and impact summary, validation script |
| Frontend (Vitest) | **129 passing** | i18n completeness, no hard-coded UI strings, storage, profile and teen rules, all screen flows, demo-engine parity with Python, suggestion rules shared with Python, analytics privacy rules |
| Accessibility (axe-core) | **11 / 11 screens, 0 violations** | WCAG 2.1 A/AA rules inside the real layout; colour contrast checked separately in a real browser (EN and BN): 0 issues |
| End-to-end (Playwright) | **5 / 5 flows** | Teen onboarding; photo → confirm → result → add to day → progress; typed meal + coach; plans; delete all data |
| Lighthouse (mobile, simulated slow 4G) | Accessibility **100**, Best Practices **100**, SEO **100**, Performance **79-92** | The performance target (85) is not met on every run: the first screen waits for local settings so it opens in the right language |
| Bundle budget | 183 KB / 200 KB JS (gzip) | Checked in CI |
| Parser regression set | 34 / 34 meals | Team-written; a regression check, **not** an accuracy result |

**Accuracy is not measured yet.** The validation tooling is ready ([docs/VALIDATION.md](docs/VALIDATION.md)): 100+ meals weighed on a kitchen scale, error per nutrient, failures included. Results will appear on the Data page and here exactly as produced.

---

## Deployment

```mermaid
flowchart LR
    Dev["git push main"] --> GA["GitHub Actions"]
    GA --> CI["CI: tests, typecheck,<br/>build, bundle budget"]
    GA --> GP["GitHub Pages<br/>/frontend (PWA)"]
    Dev --> R["Render<br/>FastAPI backend"]
    GP -->|"HTTPS + CORS<br/>(when VITE_API_BASE_URL is set)"| R
```

- **Frontend:** every push to `main` that touches `frontend/` or `backend/data/` rebuilds GitHub Pages (after the tests pass). Without a backend URL it runs in demo mode.
- **Backend:** Render Blueprint from `render.yaml`, no secrets required (offline mode). Step-by-step guide: [DEPLOY.md](DEPLOY.md).

---

## Data and sources

```mermaid
pie showData
    title Food rows by verification status (current)
    "Unverified team estimates" : 48
    "Verified from a cited source" : 0
```

| Data | Source | Status |
|---|---|---|
| Food composition (48 foods) | Team estimates | **Unverified.** To be replaced from the Food Composition Table for Bangladesh (INFS, University of Dhaka) once reuse permission is confirmed |
| Limits and targets | [WHO Healthy diet fact sheet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) (26 Jan 2026): free sugars, saturated fat, trans fat, fruit and vegetables; total fat and sodium for adults | Sourced, with URL and date |
| Teen energy, protein and micronutrient targets | none chosen yet | **Pending a dietitian-approved reference** (shown as such in the app) |
| Tips | Team-written | Unverified, awaiting dietitian review |

How to add or verify data: [docs/DATA_VERIFICATION.md](docs/DATA_VERIFICATION.md).

---

## Roadmap

```mermaid
gantt
    title EdiByte to the showcase (26 Dec 2026)
    dateFormat YYYY-MM-DD
    axisFormat %d %b
    section Built
    Plan, foundation, profile, teen mode      :done, a, 2026-11-18, 2d
    Photo, confirm, result                    :done, b, 2026-11-19, 1d
    Progress, coach, plans                    :done, c, 2026-11-19, 1d
    Data page, a11y, analytics, e2e, launch   :done, d, 2026-11-19, 1d
    section Team work for honest results
    Food-table permission and sourced data    :t1, 2026-11-20, 14d
    Dietitian review of targets, tips, words  :t2, 2026-11-20, 14d
    Deploy API and AI vision key              :t3, 2026-11-20, 3d
    Weighed-meal validation (100+ meals)      :t4, 2026-11-24, 18d
    Pilot with real users (2+ weeks)          :t5, 2026-11-27, 18d
    Feature freeze                            :milestone, 2026-12-19, 0d
    Showcase                                  :milestone, 2026-12-26, 0d
```

**Team tasks outside the code:** reuse permission for the Bangladesh food table, a dietitian to approve teen references and tips, weighing 100+ real meals for validation, an AI vision key for photo recognition, and a legal review of parental consent for minors.

---

## Team

**Team Qbits**

| Role | Member |
|---|---|
| Team Leader / Coordinator | To be confirmed |
| Business Analyst / Data Scientist | To be confirmed |
| UI/UX / Frontend Developer | Esrat Jhahan Nur, Rezwan |
| Backend / Data Engineer | Shopnil |
| Presentation / Communication Lead | Saba |

**AI usage:** AI assistants (Claude) helped with planning, code and documentation; all output is reviewed by the team. In the product, an LLM is used only to name foods and to reword facts the rules engine computed.

---

## License

[MIT](LICENSE) © 2026 Team Qbits

<div align="center">
<sub>EdiByte gives general nutrition information only. It is not medical advice. For health conditions, talk to a doctor or a registered dietitian.</sub>
</div>
