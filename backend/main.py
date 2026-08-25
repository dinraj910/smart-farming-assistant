"""
AI-Powered Smart Farming Assistant — Backend Entry Point

Run locally with:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ml.crop_model import CropRecommendationModel
from app.routers import crop
from app.routers import agent as agent_router
from app.routers import auth as auth_router
from prisma import Prisma



@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- STARTUP: load the model ONCE into memory, not per-request ----
    print("Loading Crop Recommendation model...")

    app.state.crop_model = CropRecommendationModel(
        model_dir="ml_models/crop_recommendation"
    )

    print("Model loaded. Ready to serve predictions.")
    
    # ---- STARTUP: Initialize Prisma DB Client ----
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
            print(f"Database connection dropped by Neon, retrying in 2 seconds... (Attempt {attempt+1}/10)")
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

# Authentication API
app.include_router(
    auth_router.router,
    prefix="/api/v1/auth",
    tags=["Auth"],
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