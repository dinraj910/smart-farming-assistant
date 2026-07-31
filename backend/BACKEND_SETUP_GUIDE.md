# Backend Setup Guide — Smart Farming Assistant

## 1. Architecture, in one picture

```
Mobile App (React Native)
        │  HTTPS request
        ▼
FastAPI Backend  ──────────────►  ml_models/crop_recommendation/
  ├─ main.py (loads model ONCE       ├─ model.pkl
  │   at startup, not per-request)   ├─ label_encoder.pkl
  ├─ app/routers/crop.py             ├─ metadata.json
  ├─ app/ml/crop_model.py            └─ crop_profile_stats.json
  └─ app/schemas/crop.py
        │
        ▼
PostgreSQL (Supabase) — not wired up yet, TODO left in crop.py
```

The model files live **inside the backend project itself** — no separate model server,
no MLflow, no cloud model registry. For a model this small (a few hundred KB), that's
correct engineering, not a shortcut: adding a model-serving layer here would be solving a
problem you don't have yet. Revisit this only when Model 3 (the CNN) is large enough that
git starts complaining — a "when you get there" problem, not a now problem.

## 2. How the model is managed

- **Loaded once, at startup** — `main.py`'s `lifespan` function loads `model.pkl` into
  `app.state.crop_model` when the server boots. Every prediction request reuses that same
  in-memory object. This is the #1 mistake to avoid: never call `joblib.load()` inside the
  request handler — that would reload the model from disk on every single API call.
- **Versioned by folder, not by filename.** When you retrain later, don't overwrite
  `ml_models/crop_recommendation/` in place — create `ml_models/crop_recommendation_v2/`
  and change one line in `main.py`. Keeps a rollback possible if v2 turns out worse.
- **Fails loudly, not silently.** If a `.pkl` file is missing, the app won't start at all —
  you'll see the error in your terminal immediately, not discover it when a demo request
  mysteriously 500s.

## 3. Three ways to run the backend — pick based on what you need right now

### Option A — Local only (use this for all day-to-day development)

```bash
cd backend_starter
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Drop your real model.pkl, label_encoder.pkl, metadata.json, crop_profile_stats.json
# into ml_models/crop_recommendation/ (see the README.md in that folder)

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000/docs` — FastAPI's interactive API explorer. Test the endpoint
right there before touching the mobile app at all.

**Connecting the mobile app during development:** your phone and laptop must be on the
**same Wi-Fi network**. `localhost` on your phone means the phone itself, not your laptop —
you need your laptop's local network IP instead:

```bash
# Mac/Linux
ifconfig | grep "inet "
# Windows
ipconfig
```

Look for something like `192.168.1.42`. In your Expo app's API config, use
`http://192.168.1.42:8000` as the base URL. Zero cost, zero deployment, fastest iteration
loop — this is what you'll use for 90% of development.

### Option B — Local + ngrok tunnel (temporary public URL, still zero deployment)

Use this when you need a real public HTTPS URL without deploying anywhere — e.g. a judge
wants to test on their own phone over cellular data, not your Wi-Fi.

```bash
# One-time setup: https://ngrok.com/download, create a free account
ngrok config add-authtoken <your-token-from-ngrok-dashboard>

# Every time you want a public URL (backend must already be running on port 8000):
ngrok http 8000
```

You'll get a URL like `https://a1b2-c3d4.ngrok-free.app` that forwards straight to your
laptop. Point the mobile app's API base URL at it. Two things to know:

- The free tier gives you a **new random URL every time you restart ngrok** — so update
  the app config right before any demo, not the night before.
- Your laptop has to stay on, awake, and running the backend the whole time someone's
  using that URL. It's a tunnel, not a deployment.

### Option C — Free-tier cloud hosting (Render) — a permanent URL

Use this when you want a stable URL that works even when your laptop is off — the safest
option for the actual review day.

1. Push `backend_starter/` to a GitHub repo.
2. [render.com](https://render.com) → free account → **New Web Service** → connect the repo.
3. **Build Command:** `pip install -r requirements.txt && python download_models.py`
4. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add any environment variables (e.g. `DATABASE_URL` once Postgres is wired up) under
   the Render dashboard's Environment tab — never commit real `.env` values to GitHub.
6. Deploy. You'll get `https://your-app-name.onrender.com`.

Note the Build Command now runs `download_models.py` — see Section 6 below for why. For
Model 1 specifically this step is a no-op (the files are already committed to the repo),
so nothing changes for you right now. It matters once Model 3 lands.

**The one thing that will bite you if you don't know about it in advance:** Render's free
tier spins the service down after ~15 minutes of no traffic. The next request has to "wake"
it, which takes 30–50 seconds — that will look like a frozen app mid-demo if you're not
ready for it. Fix: hit `https://your-app-name.onrender.com/health` from your phone's
browser a few minutes before you present, or set up a free pinger at
[cron-job.org](https://cron-job.org) to ping `/health` every 10 minutes during exam week.

## 4. Which one to actually use, when

| Situation | Use |
|---|---|
| Writing/testing new endpoints | Option A (local) |
| Teammate testing on their own phone, same room | Option A (same Wi-Fi) |
| Judge/guide wants to test on their own device, different network | Option B (ngrok) |
| Review day demo, need it reliable and don't want to babysit your laptop | Option C (Render), pinged awake beforehand |
| Final submission — app needs to work after you've gone home | Option C (Render) |

## 5. Model storage strategy — git vs. Hugging Face Hub

| Model | Size | Where it lives |
|---|---|---|
| Model 1 — Crop Recommendation | ~200KB | Committed directly to git (`ml_models/crop_recommendation/`) — no extra infra needed |
| Model 2 — Yield Prediction | small | Same as above |
| Model 3 — Disease Detection CNN | ~10–20MB | **Hugging Face Hub**, downloaded during Render's build step |

Git starts being the wrong tool once a binary file gets into the 10MB+ range and changes
across retraining runs — every version bloats the repo permanently, since git can't diff
binary files usefully. `download_models.py` is already wired in and set as part of the
Render Build Command above, so switching Model 3 over when it's ready is just: upload the
files to a Hugging Face model repo, add one entry to the `MODELS` dict in
`download_models.py`, done. No changes to `main.py`, no changes to how the app loads models
— it still reads from the same `ml_models/<name>/` folder either way.

One-time setup when you get there: free account at huggingface.co → create a public Model
repo → upload the files into a `disease_detection/` folder inside it → set `HF_REPO_ID` in
`download_models.py`. Public is fine — there's nothing sensitive in model weights alone.

**Keep this separate from Supabase Storage.** Supabase Storage (part of your existing
Supabase account) is for *user-uploaded content* — the leaf photos farmers submit for
disease detection (`disease_detections.image_url` in the schema). Hugging Face Hub is for
*your trained model weights*. Different jobs, both free, don't mix them up.

## 6. What's stubbed but not built yet

`app/routers/crop.py` has a `TODO` where the prediction result should get saved to the
`crop_recommendations` table (from the database schema doc) so it shows up in the app's
history. That needs the SQLAlchemy/asyncpg connection layer, which isn't in this starter —
next logical piece once you want predictions to persist rather than just returning once.
