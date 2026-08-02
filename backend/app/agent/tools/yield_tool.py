"""
Wraps the yield prediction pipeline.

Assumes Model 2 (yield_model.pkl and its encoder) has already been trained
per the earlier pipeline documentation and placed in
ml_models/yield_prediction/, following the same pattern as Model 1.
"""

import os

import joblib
import pandas as pd

_yield_model = None
_yield_encoder = None


def load_yield_model(model_dir="ml_models/yield_prediction"):
    global _yield_model, _yield_encoder

    if _yield_model is None:
        _yield_model = joblib.load(
            os.path.join(model_dir, "crop_yield_model.pkl")
        )
        _yield_encoder = joblib.load(
            os.path.join(model_dir, "encoder.pkl")
        )

    return _yield_model, _yield_encoder


def run_yield_prediction(state,district,crop,temperature,humidity,rainfall,farm_area,):
    
    model, encoder = load_yield_model()

    input_df = pd.DataFrame([
        {
            "State": state,
            "District": district,
            "Crop": crop,
            "temperature": temperature,
            "humidity": humidity,
            "rainfall": rainfall,
        }
    ])

    encoded_input = encoder.transform(input_df)

    yield_per_hectare = float(
        model.predict(encoded_input)[0]
    )

    total_estimated_harvest = yield_per_hectare * farm_area

    return {
        "yield_per_hectare": round(yield_per_hectare, 2),
        "total_estimated_harvest": round(
            total_estimated_harvest,
            2,
        ),
    }