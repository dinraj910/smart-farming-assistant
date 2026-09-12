"""
AI-Powered Smart Farming Assistant — Backend Entry Point

Run locally with:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ml.crop_model import CropRecommendationModel
from app.routers import crop
from app.routers import agent as agent_router
from app.routers import auth as auth_router
from app.routers import farm as farm_router
from app.routers import disease as disease_router
from app.routers import market as market_router
from app.routers import cron as cron_router
from prisma import Prisma



@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- STARTUP: load the model ONCE into memory, not per-request ----
    print("Loading Crop Recommendation model...")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "ml_models", "crop_recommendation")

    app.state.crop_model = CropRecommendationModel(
        model_dir=model_path
    )

    print("Model loaded. Ready to serve predictions.")
    
    # ---- STARTUP: Initialize Prisma DB Client ----
    print("Configuring Prisma query engine...")
    from pathlib import Path
    backend_dir = Path(__file__).resolve().parent
    for candidate in backend_dir.iterdir():
        if "query-engine" in candidate.name and not candidate.is_dir():
            try:
                os.chmod(candidate, 0o755)
            except Exception:
                pass
            os.environ["PRISMA_QUERY_ENGINE_BINARY"] = str(candidate)
            print(f"Using Prisma query engine: {candidate.name}")
            break

    print("Connecting to database...")
    import asyncio
    db = Prisma()
    for attempt in range(10):
        try:
            await db.connect()
            break
        except Exception as e:
            if attempt == 9:
                raise e
            print(f"Database connection attempt {attempt+1}/10 failed: {e}. Retrying in 2 seconds...")
            await asyncio.sleep(2)
            
    app.state.db = db
    print("Database connected.")

    yield

    # ---- SHUTDOWN ----
    print("Disconnecting from database...")
    await app.state.db.disconnect()
    print("Shutting down.")


app = FastAPI(
    title="Smart Farming Assistant API",
    description="Backend for crop recommendation, disease detection, weather, market intelligence, and AI-powered agricultural advisory.",
    version="0.1.0",
    lifespan=lifespan,
)

# Mobile app (Expo dev server / built app) calls this from a different origin.
# Tighten allow_origins before production deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# API Routers
# -----------------------------

# Existing Crop Recommendation API
app.include_router(
    crop.router,
    prefix="/api/v1",
    tags=["Crop Recommendation"],
)

# New Agentic AI Advisory API
app.include_router(
    agent_router.router,
    prefix="/api/v1",
    tags=["Agent"],
)

# Farm API
app.include_router(
    farm_router.router,
    prefix="/api/v1",
    tags=["Farm"],
)

# Disease Detection API
app.include_router(
    disease_router.router,
    prefix="/api/v1",
    tags=["Disease Detection"],
)

# Market Intelligence API (Agmarknet Live Mandi Data)
app.include_router(
    market_router.router,
    prefix="/api/v1",
    tags=["Market Intelligence"],
)

# Authentication API
app.include_router(
    auth_router.router,
    prefix="/api/v1/auth",
    tags=["Auth"],
)

# Cron and Keep-Alive API
app.include_router(
    cron_router.router,
    prefix="/api/v1/cron",
    tags=["Cron"],
)


@app.get("/health")
def health_check():
    """
    Used by Render/uptime pingers to check the service is alive,
    and to wake a sleeping free-tier instance.
    """
    return {"status": "ok"}


@app.get("/")
def root():
    return {
        "message": (
            "Smart Farming Assistant API is running. "
            "See /docs for the interactive API explorer."
        )
    }