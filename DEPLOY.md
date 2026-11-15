# Deploy EdiByte from GitHub

| Part | Host | Deploys when |
|---|---|---|
| Frontend (React) | GitHub Pages, `https://es-ratt.github.io/edibyte/` | every push to `main` that changes `frontend/` (`.github/workflows/deploy-frontend.yml`) |
| Backend (FastAPI) | Render free tier, connected to this GitHub repo | every push to `main` (`render.yaml`) |

GitHub Pages only serves static files, so the Python backend runs on Render. Render reads the code from GitHub; after the one-time setup below you only push to `main`.

Until step 2 is done the Pages site runs in **Demo mode** (4 sample foods, labelled "Demo data").

## 1. Backend on Render (one time, about 5 minutes)

1. Sign in at [render.com](https://render.com) with **GitHub**.
2. **New → Blueprint**. Allow Render to see the `es-ratt/edibyte` repo and select it.
3. Render reads `render.yaml` and shows one service, `edibyte-api`. Click **Deploy Blueprint**. No secrets are needed.
4. When the deploy is green, copy the service URL (for example `https://edibyte-api.onrender.com`, Render may add a suffix).
5. Open `<that URL>/health`. You should see `"status":"ok"` and `"foods":48`.

The free tier sleeps after about 15 minutes idle; the first request then takes up to a minute. Open `/health` a few minutes before a demo.

## 2. Point GitHub Pages at the backend

1. GitHub repo → **Settings → Secrets and variables → Actions → Variables** tab → **New repository variable**.
2. Name `VITE_API_BASE_URL`, value = the Render URL from step 1.4 (no trailing slash).
3. **Actions → Deploy frontend to GitHub Pages → Run workflow** (branch `main`).
4. When it is green, open `https://es-ratt.github.io/edibyte/`. The "Demo data" badge should be gone.

Mock data switches off automatically once `VITE_API_BASE_URL` is set. To force demo mode again, add a variable `VITE_USE_MOCK_DATA` = `true`.

## Optional settings (Render → `edibyte-api` → Environment)

| Variable | Why |
|---|---|
| `DATABASE_URL` | PostgreSQL URL (Neon or Supabase free tier). Without it the app uses SQLite, which Render wipes on restart: the food table is reseeded automatically, but anonymous meal history is lost. |
| `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY` | AI mode for the coach and photo input. Without them the app runs in offline mode. The key stays on the backend only. |
| `ENABLE_PHOTO` | `true` to enable photo input (needs AI mode). |
| `CORS_ORIGINS` | Already set to `https://es-ratt.github.io,http://localhost:5173`. Add an origin here if the frontend moves. |

## Smoke test

- `/health` shows `"status":"ok"`.
- Log `fuchka 10ta`: about 150 g with a "check the portion" note (not 1500 g).
- Log `bhat 300g dal 200ml`: two rows, 300 g and 200 ml.
- Coach: "How much protein is in an egg?" answers with a source.
- Coach: "ami diabetes er jonno ki khabo" gives a safe redirect to a doctor.

## If something fails

| Symptom | Cause |
|---|---|
| Site still shows "Demo data" | `VITE_API_BASE_URL` not set, or the Pages workflow was not re-run after setting it |
| "Can't reach the server" in the app | Backend asleep (wait a minute) or `CORS_ORIGINS` missing `https://es-ratt.github.io` |
| Render build fails | Open the Render deploy log; Python must be 3.12 (`PYTHON_VERSION` in `render.yaml`) |
