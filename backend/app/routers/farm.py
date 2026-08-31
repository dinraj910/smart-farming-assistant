from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.auth.dependencies import get_current_user
from app.routers.auth import safe_db_execute

router = APIRouter(
    prefix="/farms",
    tags=["Farms"]
)

class FarmCreate(BaseModel):
    name: str
    location: str
    acres: str
    npk: Optional[str] = None
    status: str = "Inspection Due"
    image: Optional[str] = None

class FarmResponse(BaseModel):
    id: str
    userId: str
    name: str
    location: str
    acres: str
    npk: Optional[str]
    status: str
    image: Optional[str]
    createdAt: datetime
    updatedAt: datetime

@router.get("", response_model=List[FarmResponse])
async def get_my_farms(request: Request, current_user = Depends(get_current_user)):
    """Get all farms registered by the current user"""
    farms = await safe_db_execute(
        request, 
        "farm.find_many", 
        where={"userId": current_user.id},
        order={"createdAt": "desc"}
    )
    return farms

@router.post("", response_model=FarmResponse, status_code=status.HTTP_201_CREATED)
async def create_farm(farm_data: FarmCreate, request: Request, current_user = Depends(get_current_user)):
    """Register a new farm plot"""
    img_url = farm_data.image or 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80'
    
    new_farm = await safe_db_execute(
        request,
        "farm.create",
        data={
            "userId": current_user.id,
            "name": farm_data.name,
            "location": farm_data.location,
            "acres": farm_data.acres,
            "npk": farm_data.npk or "NPK: --",
            "status": farm_data.status,
            "image": img_url
        }
    )
    return new_farm
