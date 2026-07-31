"""
Loads and serves the trained Crop Recommendation model (from the Colab training notebook).

Expects the following files inside `model_dir`:
    model.pkl                — trained sklearn/xgboost classifier
    label_encoder.pkl        — sklearn LabelEncoder (class index -> crop name)
    metadata.json            — feature order, accuracy, Kerala-relevant crop list
    crop_profile_stats.json  — per-crop feature mean/std, used for the "why this crop?" explanation
                                (see the notebook addendum cell that exports this file)
"""
import json
import os
import joblib
import numpy as np
import pandas as pd


class CropRecommendationModel:
    def __init__(self, model_dir: str):
        self.model = joblib.load(os.path.join(model_dir, "model.pkl"))
        self.label_encoder = joblib.load(os.path.join(model_dir, "label_encoder.pkl"))

        with open(os.path.join(model_dir, "metadata.json")) as f:
            self.metadata = json.load(f)

        stats_path = os.path.join(model_dir, "crop_profile_stats.json")
        if os.path.exists(stats_path):
            with open(stats_path) as f:
                self.crop_stats = json.load(f)
        else:
            self.crop_stats = None
            print("WARNING: crop_profile_stats.json not found — explanations will use a generic fallback message.")

        self.feature_order = self.metadata["feature_order"]
        self.kerala_relevant_crops = set(self.metadata.get("kerala_relevant_crops", []))

    def _explain(self, input_values: dict, predicted_crop: str) -> str:
        if self.crop_stats is None or predicted_crop not in self.crop_stats:
            return "This crop was the closest overall statistical match to your soil and climate inputs."

        profile = self.crop_stats[predicted_crop]
        matching_features = []
        for feature, value in input_values.items():
            stat = profile.get(feature)
            if stat and abs(value - stat["mean"]) <= stat["std"]:
                matching_features.append(feature)

        if matching_features:
            return f"Your {', '.join(matching_features)} closely match the typical range for this crop."
        return "This crop was the closest overall statistical match to your soil and climate inputs."

    def predict(self, N: float, P: float, K: float, temperature: float,
                humidity: float, ph: float, rainfall: float) -> dict:
        input_values = {
            "N": N, "P": P, "K": K,
            "temperature": temperature, "humidity": humidity,
            "ph": ph, "rainfall": rainfall,
        }
        input_df = pd.DataFrame([input_values])[self.feature_order]

        proba = self.model.predict_proba(input_df)[0]
        top_idx = np.argsort(proba)[::-1][:3]

        top_crop = self.label_encoder.inverse_transform([top_idx[0]])[0]

        return {
            "recommended_crop": top_crop,
            "confidence_score": round(float(proba[top_idx[0]]), 4),
            "is_kerala_relevant": top_crop in self.kerala_relevant_crops,
            "explanation": self._explain(input_values, top_crop),
            "alternatives": [
                {
                    "crop": self.label_encoder.inverse_transform([i])[0],
                    "confidence_score": round(float(proba[i]), 4),
                }
                for i in top_idx[1:]
            ],
        }
