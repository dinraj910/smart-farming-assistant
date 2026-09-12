"""
Wraps the yield prediction pipeline. Loads a single scikit-learn Pipeline
(preprocessing + trained regressor bundled together) exported by
yield_prediction_training.ipynb -- there is no separate encoder.pkl,
unlike the original two-file assumption in the Agent Dev Guide.
"""
import joblib
import os
import json
import pandas as pd

_yield_pipeline = None
_yield_metadata = None


def load_yield_model(model_dir="ml_models/yield_prediction"):
    global _yield_pipeline, _yield_metadata
    if _yield_pipeline is None:
        candidates = [
            os.path.join(model_dir, "crop_yield_pipeline.pkl"),
            os.path.join("ml_models/Yield_prediction", "crop_yield_pipeline.pkl"),
        ]
        chosen_path = None
        for p in candidates:
            if os.path.exists(p):
                chosen_path = p
                break

        if not chosen_path:
            return None, None

        try:
            _yield_pipeline = joblib.load(chosen_path)
            meta_path = os.path.join(os.path.dirname(chosen_path), "metadata.json")
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    _yield_metadata = json.load(f)
            else:
                _yield_metadata = {}
        except Exception as e:
            print("Yield model load notice:", e)
            return None, None

    return _yield_pipeline, _yield_metadata


def run_yield_prediction(crop: str, season: str, state: str,
                          annual_rainfall: float, farm_area: float):
    """
    farm_area is in HECTARES -- if your app collects farm size in acres
    (as the rest of the project does, per the database schema's area_acres
    field), convert before calling this: hectares = acres * 0.4047.
    """
    pipeline, metadata = load_yield_model()
    if pipeline is None or metadata is None:
        return {
            "error": "Trained yield regressor is not bundled. The agent should fall back to kau_knowledge_search for expected harvest and yield guidelines."
        }

    # Case-insensitive lookup maps
    crops_map = {c.lower(): c for c in metadata.get("crops_covered", [])}
    states_map = {s.lower(): s for s in metadata.get("states_covered", [])}
    seasons_map = {s.lower(): s for s in metadata.get("seasons_covered", [])}

    actual_crop = crops_map.get(crop.strip().lower())
    if not actual_crop:
        return {
            "error": f"'{crop}' is not covered by the trained yield model. "
                     f"The agent should fall back to kau_knowledge_search for this crop instead."
        }
        
    actual_state = states_map.get(state.strip().lower())
    if not actual_state:
        return {"error": f"'{state}' is not covered by the trained yield model."}

    actual_season = seasons_map.get(season.strip().lower(), season.strip().title())

    input_df = pd.DataFrame([{
        "Crop": actual_crop, "Season": actual_season, "State": actual_state,
        "Annual_Rainfall": annual_rainfall,
    }])

    yield_per_hectare = float(pipeline.predict(input_df)[0])
    total_estimated_harvest = yield_per_hectare * farm_area

    return {
        "yield_per_hectare": round(yield_per_hectare, 2),
        "total_estimated_harvest": round(total_estimated_harvest, 2),
        "unit": "tons",
    }