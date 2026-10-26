# Deploy EdiByte with real AI

The GitHub Pages site shows **Demo mode** (sample data) until the backend is online and the frontend points at it. Do these 3 steps.

## 1. Deploy the backend (Render)

1. Go to render.com → **New → Blueprint** → pick this repo. It reads `render.yaml` and creates the `edibyte-api` service.
2. In the `edibyte-api` service → **Environment**, set:

| Variable | Value |
|---|---|
| `LLM_PROVIDER` | `gemini`, `openai` or `anthropic` |
| `LLM_MODEL` | the model id from your provider |
| `LLM_API_KEY` | your API key (secret, backend only) |
| `CORS_ORIGINS` | `https://es-ratt.github.io,https://edibyte-web.onrender.com` (origins only, no path) |
| `DATABASE_URL` | a PostgreSQL URL (Neon or Supabase free tier). SQLite files are wiped when a free Render service restarts |

3. Open `https://<your-api>.onrender.com/health`. It should show `"mode": "ai"`. If it says `offline`, the provider, model or key is missing.

The free tier sleeps when idle and takes up to a minute to wake. Open the `/health` link a few minutes before any demo.

## 2. Point the GitHub Pages build at it

Repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Name | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<your-api>.onrender.com` (no trailing slash) |
| `VITE_USE_MOCK_DATA` | `false` |

## 3. Redeploy

**Actions → Deploy frontend to GitHub Pages → Run workflow.** When it is green, open `https://es-ratt.github.io/edibyte/`. The "Demo mode" banner should be gone and the coach badge should say **AI mode**.

## Smoke test (do this before the judges do)

- "ekta dim e koto protein?" → answer in Banglish
- "একটা ডিমে কত প্রোটিন?" → answer in Bangla
- "How much protein is in an egg?" → answer in English
- "Hi" → friendly greeting
- "ami diabetes er jonno ki khabo" → safe redirect to a doctor
- Log the demo meal → review → report → History page shows it
