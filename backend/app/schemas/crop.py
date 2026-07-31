from pydantic import BaseModel, Field
from typing import List


class CropRecommendationRequest(BaseModel):
    nitrogen: float = Field(..., ge=0, le=200, description="Soil nitrogen (N) value")
    phosphorus: float = Field(..., ge=0, le=200, description="Soil phosphorus (P) value")
    potassium: float = Field(..., ge=0, le=200, description="Soil potassium (K) value")
    temperature: float = Field(..., ge=-10, le=55, description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity %")
    ph: float = Field(..., ge=0, le=14, description="Soil pH")
    rainfall: float = Field(..., ge=0, le=5000, description="Rainfall in mm")

    class Config:
        json_schema_extra = {
            "example": {
                "nitrogen": 20, "phosphorus": 15, "potassium": 30,
                "temperature": 27.5, "humidity": 85, "ph": 6.0, "rainfall": 220
            }
        }


class CropAlternative(BaseModel):
    crop: str
    confidence_score: float


class CropRecommendationResponse(BaseModel):
    recommended_crop: str
    confidence_score: float
    is_kerala_relevant: bool
    explanation: str
    alternatives: List[CropAlternative]
