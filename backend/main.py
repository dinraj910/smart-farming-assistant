"""
AI-Powered Smart Farming Assistant — Backend Entry Point
Run locally with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ml.crop_model import CropRecommendationModel
from app.routers import crop


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- STARTUP: load the model ONCE into memory, not per-request ----
    print("Loading Crop Recommendation model...")
    app.state.crop_model = CropRecommendationModel(model_dir="ml_models/crop_recommendation")
    print("Model loaded. Ready to serve predictions.")
    yield
    # ---- SHUTDOWN: nothing to clean up for this model ----
    print("Shutting down.")


app = FastAPI(
    title="Smart Farming Assistant API",
    description="Backend for crop recommendation, disease detection, weather, and market intelligence.",
    version="0.1.0",
    lifespan=lifespan,
)

# Mobile app (Expo dev server / built app) calls this from a different origin — CORS must allow it.
# Tighten allow_origins to your actual deployed frontend domain before a real production launch.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crop.router, prefix="/api/v1", tags=["Crop Recommendation"])


@app.get("/health")
def health_check():
    """Used by Render/uptime pingers to check the service is alive, and to 'wake' a sleeping free-tier instance."""
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "Smart Farming Assistant API is running. See /docs for the interactive API explorer."}
