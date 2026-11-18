# EdiByte web (v2, in progress)

New mobile-first PWA replacing `/frontend` (legacy, kept until this app is complete). Plan: [docs/REBUILD_PLAN.md](../docs/REBUILD_PLAN.md).

## Run

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

Demo mode (sample data, "Demo data" banner) is used when `VITE_API_BASE_URL` is empty or `VITE_USE_MOCK_DATA=true`. For the real backend copy `.env.example` to `.env.local`.

## Checks

```bash
pnpm typecheck
pnpm test           # unit tests, i18n completeness, no hard-coded UI strings
pnpm build && pnpm size   # PWA build + JS budget (200 KB gzip)
```

## Layout

| Path | What |
|---|---|
| `src/app` | router, layout (top bar, banners, bottom nav), zustand store |
| `src/routes` | one file per screen |
| `src/components` | shared UI primitives |
| `src/features/*` | screen logic per feature (filled from Phase 2) |
| `src/lib/db` | IndexedDB: profile, meals, plans, settings, event queue (local-first) |
| `src/lib/i18n` | `bn.ts` is the key source; `en.ts`, `banglish.ts` must match |
| `src/lib/api` | `Api` interface, live client, demo adapter |
| `src/styles` | design tokens (Tailwind 4 `@theme`) with measured contrast |

## Rules for new code

- Every visible string goes through `t()`; add the key to all three languages.
- Mustard is a fill only (2.1:1 on cream). Limit text and bar outlines use `amber-ink`. Terracotta only for allergy/medical notices.
- Nothing personal leaves the device unless a feature needs it; never store photos.
