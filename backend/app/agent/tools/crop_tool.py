"""
Thin wrapper: the agent calls this function by name; internally it just
calls your already-working CropRecommendationModel.
"""

# Model 1 only knows these 22 crops. The agent's system prompt (Phase 6)
# is told this explicitly so it never calls this tool for an unsupported crop.
SUPPORTED_CROPS = [
    "rice",
    "maize",
    "chickpea",
    "kidneybeans",
    "pigeonpeas",
    "mothbeans",
    "mungbean",
    "blackgram",
    "lentil",
    "pomegranate",
    "banana",
    "mango",
    "grapes",
    "watermelon",
    "muskmelon",
    "apple",
    "orange",
    "papaya",
    "coconut",
    "cotton",
    "jute",
    "coffee",
]


def run_crop_recommendation(crop_model, N, P, K, temperature, humidity, ph, rainfall,):
    
    """
    crop_model is the already-loaded CropRecommendationModel instance
    from app.state (see main.py) -- passed in, not re-loaded here.
    """

    return crop_model.predict(
        N=N,
        P=P,
        K=K,
        temperature=temperature,
        humidity=humidity,
        ph=ph,
        rainfall=rainfall,
    )