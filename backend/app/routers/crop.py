from fastapi import APIRouter, Request, HTTPException

from app.schemas.crop import CropRecommendationRequest, CropRecommendationResponse

router = APIRouter()


@router.post("/crop-recommendation", response_model=CropRecommendationResponse)
def get_crop_recommendation(payload: CropRecommendationRequest, request: Request):
    """
    FR-1 / US-4: recommend a Kerala-relevant crop from soil + climate inputs.
    The model is loaded once at app startup (see main.py lifespan) — this endpoint
    just runs inference, it never reloads the model from disk.
    """
    model = request.app.state.crop_model
    try:
        result = model.predict(
            N=payload.nitrogen,
            P=payload.phosphorus,
            K=payload.potassium,
            temperature=payload.temperature,
            humidity=payload.humidity,
            ph=payload.ph,
            rainfall=payload.rainfall,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    # TODO (next step): persist this result to the crop_recommendations table
    # via SQLAlchemy/asyncpg once the DB layer is wired up, so it shows up
    # under "My Fields" history in the app.

    return result
