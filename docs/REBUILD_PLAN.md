# EdiByte rebuild plan (Phase 0 audit)

Date: 2026-11-18 · Event: 2026-12-26 (about 5.5 weeks) · Baseline: `main` @ c8ce578

Status: **plan only, no code changed.** Decisions marked **DECIDE** need the team before the phase that uses them.

---

## 1. Where the repo is today

### Backend (`/backend`, FastAPI, Python 3.12) — keep and extend
| Area | State |
|---|---|
| Endpoints | `GET /health`, `POST /meal/parse`, `POST /meal/report`, `POST /meal/parse-image` (flag `ENABLE_PHOTO`, needs LLM), `POST /coach`, `GET /foods`, `GET /profiles/demo`, `POST /profiles/targets`, `GET /data/status`, `GET /eval/results`, `DELETE /session/data` |
| Parser / matcher | Rule-based + optional LLM extraction; rapidfuzz matcher (threshold 88, longest exact alias first, `uncertain` < 0.9); piece_grams; merge of repeated foods |
| Rules engine (`rules.py`) | Mifflin-St Jeor energy, macro targets, per-meal tips, price swaps. **Adult-only** (age 18–80, `lose` goal with 15% deficit) |
| Coach | Keyword guardrails → BM25 over foods + tips → LLM (Gemini/Anthropic/OpenAI via env) or offline template. Relevance filter fixed (bug 4e) |
| LLM layer (`llm.py`) | Provider-agnostic text + vision, `LLMUnavailable` fallback. Good base for the provider abstraction |
| Privacy | No user text in logs; meal logs store food ids + grams only; X-Forwarded-For only with `TRUST_PROXY` |
| Tests | **65 passing** (`pytest -q`), incl. regression tests for section 9 bugs a–f |
| Deploy | `render.yaml` (backend only, no secrets needed). **Not deployed yet**: `edibyte-api.onrender.com/health` → 404 |

**Not present, although the prompt assumes them:** `verdict.py`, `guide.py`, `/meal/guide`, photo UI components (`FitVerdict.tsx`, `lib/image.ts`). These are built new in P3.

### Data (`/backend/data`) — the weakest part
| File | Rows | State |
|---|---|---|
| `foods_seed.csv` | 48 | **All unverified team placeholders.** Only kcal, protein, carbs, fat, fibre. No sodium, sugars, sat/trans fat, micronutrients, provenance fields, food-group flags |
| `tips_seed.csv` | 15 | All unverified, no `reviewed_by`, no trigger column |
| `eval/meals_test.jsonl` | 34 | Team-written parser regression set, not an accuracy measure |

### Frontend (`/frontend`, React 19 + Vite 8 + Tailwind 4 + recharts) — legacy, kept until `/web` works
- 15 pages, 16 components, i18n with 345 keys (bn/en/banglish), mock API for GitHub Pages.
- Text-first logging flow (type meal → review → report). No photo UI, no onboarding, no plans, no teen mode.
- Adult framing: calorie donut and kcal targets are the hero; daily history chart in kcal.
- Bundle: ~877 KB of assets (recharts chunk 390 KB).
- Deployed: GitHub Pages, **demo data** until `VITE_API_BASE_URL` is set.

### Section 9 bugs
| Bug | State |
|---|---|
| a–f | **Fixed and merged** (PR #5), regression tests in `backend/tests/test_section4_bugs.py`. Skip in P1 |
| g | Done: `edibyte-update/` deleted, fake login removed, Team names filled, README placeholders replaced |
| h | Relabelled as a regression check. Real replacement = weighed-meal validation (P8), needs team kitchen-scale data |

### Design input
- No `/design` Stitch export in the repo. Use section 5 tokens of the prompt.
- `e:\Qbits\finalProject\design-resources\` (Kage, Towers, CollectUI) for inspiration only. Kage/Towers have no licence: no code or assets are copied.

---

## 2. What stays, what is replaced

| Keep | Extend | Replace / new |
|---|---|---|
| Parser, matcher, units, piece_grams | Food model: full nutrient set + provenance + food-group flags | `/web` frontend (new app; `/frontend` retired in P9) |
| `llm.py` provider layer | `/meal/report`: ranges, confidence, % target / % limit, verdict, suggestions, sources | `rules.py` targets → `reference_targets.csv` provider (no hard-coded adult formulas for teens) |
| Guardrails (keyword, testable) | Guardrails: allergy → "I can't verify this" + general guidance, not a flat refusal | Tips library → `tips.csv` with trigger, reviewed_by, active |
| BM25 retrieval | Optional multilingual embeddings, BM25-only fallback; number post-check | Eval → weighed-meal validation script |
| Middleware, privacy, tests | New: `/meal/plan-check`, `/suggestions`, `/reference/targets`, `/events`, `/impact/summary`, `/feedback/item` | Legacy `/profiles/targets` (adult Mifflin) kept only for adults, behind the provider |

---

## 3. Blockers and risks (read first)

### B1. Food composition licence — **blocks verified data** (DECIDE / contact)
FCT Bangladesh 2013 page states no reuse licence. Until INFS gives written permission, every nutrient row stays `verified=false` and the app shows "unverified sample" chips. **The showcase can run on labelled sample data; it cannot claim verified data.** Action: email INFS this week (ask for written permission + attribution wording). Same for the street-food paper dataset (arXiv 2509.01415).

### B2. Teen "% of daily limit" is not computable yet — **biggest design decision** (DECIDE)
WHO healthy-diet fact sheet (26 Jan 2026), checked today:
- Free sugars < 10% of daily **energy**; saturated fat ≤ 10% of energy; trans fat ≤ 1% of energy; total fat ≤ 30% of energy.
- Salt < 5 g/day (2 g sodium) is for **adults**. "For children the maximum amount of sodium is less and needs to be estimated based on energy intake."
- Fruit + vegetables ≥ 400 g/day for everyone older than 10. Usable for teens directly.
- The current page does **not** mention potatoes, so "potatoes don't count" cannot be sourced from it. Need another source (older WHO fact sheet or national guidelines) or drop the rule.

So every limit for 13–17 year olds depends on an energy reference, which the team has not chosen. Options:
1. **Per-meal share of energy (recommended for the showcase):** "Free sugars give 18% of this meal's energy. WHO: under 10% of daily energy." Computable from food data alone, honest, no teen target needed. Label it "share of this meal", never "% of your daily limit".
2. Wait for a dietitian-approved teen energy reference, then show true "% of daily limit".
3. Adults (18–19) only: sodium "% of daily limit" from the WHO adult value.

Until decided: targets rows stay empty with "awaiting dietitian-approved reference"; result screen shows habit feedback + option 1.

### B3. Data volume vs time
Prompt wants ~100 recipes, a portion atlas, top-40 junk foods, ~100 label photos and 100 weighed meals. None exist. These are **team field work**, not code. Realistic for 26 Dec: the schema, import tools, capture tools and validation script (code), plus whatever the team collects. Recommendation: team starts weighing meals and photographing labels in week 1, in parallel.

### B4. Photo flow needs a vision LLM key
Real-mode photo identification needs `LLM_PROVIDER/MODEL/API_KEY` on Render. Without it, real mode falls back to text/search entry. Demo mode uses mocked vision results. **DECIDE:** provider + who pays.

### B5. Minors: legal and consent — flag only
Users mostly under 18. Need legal review of parental consent and data handling before any public pilot with minors. The app collects minimum data, stores locally, no accounts. Not decided by engineering.

### B6. Schedule
10 phases with a review gate each in ~5.5 weeks = about 3 working days per phase. Risky. See section 6 for the showcase-first order.

### Smaller risks
- React version: prompt says React 18; repo is on React 19 (tests pass). **Recommend React 19** in `/web` to avoid a downgrade; switch if the team insists.
- Render free tier sleeps (≈1 min cold start). Pre-warm before the demo; keep a recorded demo video as backup.
- SQLite on Render is wiped on restart: fine for the showcase (food table reseeds), lose anonymous events. Neon/Supabase free Postgres needed before the pilot (P8).
- Bundle size: recharts is 390 KB. Use plain SVG charts in `/web` to keep the PWA light (target < 200 KB JS gzip).
- Coach number post-check can make AI answers fall back to offline often; measure the fallback rate.
- ECC rules (installed globally) ask for 80% coverage and TDD; applied where they don't slow the critical path.

---

## 4. Architecture of `/web`

```
web/
  src/
    app/            router, providers, layout (bottom nav, language switch)
    routes/         welcome, onboarding, home, capture, confirm, result, coach,
                    progress, plans, settings, data-sources
    components/     Button, Card, Chip (confidence/source), RangeBar, Segmented, Sheet, EmptyState
    features/
      profile/      form, teen-mode logic, BMI-for-age (words only)
      capture/      camera/gallery, resize (1280 px JPEG, EXIF dropped), plate guide
      report/       verdict, plate balance, nutrient sections, how-calculated
      coach/        chat, citation chips, safe-answer card
      progress/     habit metrics, week/month/year, suggestion card
      plans/        day/week/month, pre-check, planned-vs-actual
      safety/       pause tracking, hide numbers, wellbeing placeholder, support card
    lib/
      db/           IndexedDB (idb): profile, meals, plans, settings, events queue
      i18n/         bn | en | banglish, completeness test
      api/          real client + demo adapter (same interface)
      targets/      reference_targets provider client
    styles/         tokens
  public/           manifest, icons, service worker
```

- State: zustand (≈1 KB). Persistence: `idb`. Router: react-router.
- Demo adapter implements the full API interface with sample data, shows a "demo data" banner, so GitHub Pages works without the backend.
- i18n: tiny custom module (existing pattern), typed keys, a unit test fails on any missing key, ESLint rule against raw JSX strings.
- PWA: `vite-plugin-pwa` (offline shell, installable), low-data mode = no images, no prefetch.
- Design tokens (section 5): Olive 700 #4F6B2A, Olive 900 #2F3E1A, Olive 50 #F2F5E9, Mustard #E0A526, Mustard 100 #FBF1D6, Cream #FBFAF5, Ink #22281B, Muted #5E6653, Terracotta #B3402A (allergy/medical only). Hind Siliguri + Inter, 20 px cards, 48 px tap targets, 480 px column on desktop. Contrast checked against WCAG AA in P1 (mustard on cream needs checking for text use).

## 5. Backend additions

| Endpoint | Phase | Notes |
|---|---|---|
| `GET /reference/targets?age&sex&activity` | P2 | Reads `reference_targets.csv`; returns sourced rows or `unavailable` with reason |
| `POST /meal/report` (extended) | P3 | Ranges (low/high from confidence), % target / % limit (only when sourced), per-meal energy shares, verdict, add-ons/swaps respecting diet, sources per number |
| `POST /meal/parse-image` (extended) | P3 | Names foods + rough portions only; never numbers |
| `POST /coach` (extended) | P4 | Meal context + 7-day habit summary; citations; number post-check |
| `POST /suggestions` | P5 | Rule-chosen tip from `tips.csv` |
| `POST /meal/plan-check` | P6 | Same engine as report |
| `POST /events`, `GET /impact/summary` | P8 | Anonymous events, secret header |
| `POST /feedback/item` | P3 | Food ids only |

Data files added: `reference_targets.csv`, `tips.csv`, `recipes.csv`, `portions.csv`, `brand_items.csv`, `prices.csv` (empty templates where no sourced data exists). `foods.csv` gains provenance + nutrient + flag columns; unknown = empty (null).

---

## 6. Phase plan

Prompt phases, with a **showcase-first** ordering so a complete demo exists early even if later phases slip.

| Phase | Scope | Exit criteria | Est. |
|---|---|---|---|
| **P0** | This audit | `docs/REBUILD_PLAN.md` | done |
| **P1** | `/web` scaffold, tokens, i18n + completeness test, routing, bottom nav, IndexedDB, PWA shell, demo adapter, CI job for `/web` | `pnpm typecheck/test/build` green; all routes render in demo mode; CI green | 3 d |
| **P2** | Onboarding/profile (S1), teen mode, settings & safety (S9), `reference_targets.csv` + `/reference/targets`, BMI-for-age (words only) | Under-18 → teen mode, no weight-loss goal, no weight shown; targets endpoint returns sourced or `unavailable` | 3 d |
| **P3** | Home, capture, confirm, result (S2–S5); backend report with ranges, verdict, sources; food model migration | Full photo → confirm → result works in demo mode (mocked vision) and real mode (text fallback without key) | 5 d |
| **P5** | Progress (S7) week view first, then month/year; `/suggestions` | Habit metrics from logged meals; "based on X of Y"; sample data labelled | 3 d |
| **P4** | Coach (S6), knowledge base, citations, post-check | Answers cite sources; numbers not in retrieved rows are removed; safe-answer card | 3 d |
| **P6** | Plans (S8) with pre-check | Day/week/month plans; "5 of 7 is a win" | 3 d |
| **P7** | Data & sources (S10), privacy, accessibility, wellbeing placeholder | axe clean on all routes; honest counts | 2 d |
| **P8** | Events, impact summary, validation script | Script compares app vs scale data and writes honest results | 2 d |
| **P9** | Polish, Lighthouse, Playwright e2e, deploy, swap `/web` → `/frontend`, docs, zip | All gates green; demo + real mode live | 3 d |

P5 is moved before P4 because the weekly progress view is central to the adoption and health-outcome story, and the existing coach already works.

**Feature freeze: 2026-12-19.** Last week: demo video, rehearsal, docs.

### Quality gates (P1 onward, all in CI)
- Backend: `ruff`, `pytest`.
- Web: `tsc`, `vitest` (incl. i18n completeness), `vite build`, bundle-size check.
- P9: Playwright e2e (onboarding, mocked photo, confirm, result, coach, progress, plans, delete data), axe, Lighthouse mobile targets: **Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95**.

---

## 7. Team work in parallel (not code, needed for honest results)

| Task | Owner | By |
|---|---|---|
| Email INFS for FCT 2013 permission; ask arXiv 2509.01415 authors about the dataset | team lead | week 1 |
| Find a dietitian to approve teen references, tips and teen wording | team | week 1 |
| Choose vision LLM provider and key | team | before P3 |
| Deploy backend on Render (`DEPLOY.md`) | team | week 1 |
| Weigh 100+ real meals (incl. street/fast food), photograph each | team | weeks 2–4 |
| Photograph nutrition panels of top packaged snacks/drinks | team | weeks 2–3 |
| Write wellbeing check-in questions (psychologist/dietitian) | expert | before P7 |
| Legal / parental-consent review for minors | team + adviser | before pilot |

---

## 8. Decisions needed from the team

1. **B2:** how to show limits for teens without an energy reference (recommend option 1: per-meal energy share vs WHO).
2. **B2:** source for "potatoes don't count as vegetables", or drop the rule.
3. **B4:** vision LLM provider and key.
4. React 19 (recommended) or downgrade to 18.
5. Confirm P5-before-P4 reordering.
