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

class FarmUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    acres: Optional[str] = None
    npk: Optional[str] = None
    status: Optional[str] = None

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

@router.get("/{farm_id}", response_model=FarmResponse)
async def get_farm(farm_id: str, request: Request, current_user = Depends(get_current_user)):
    """Get a single farm by ID"""
    farm = await safe_db_execute(
        request,
        "farm.find_unique",
        where={"id": farm_id}
    )
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if str(farm.userId) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this farm")
    return farm

@router.put("/{farm_id}", response_model=FarmResponse)
async def update_farm(farm_id: str, farm_data: FarmUpdate, request: Request, current_user = Depends(get_current_user)):
    """Update an existing farm plot"""
    existing = await safe_db_execute(request, "farm.find_unique", where={"id": farm_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Farm not found")
    if str(existing.userId) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this farm")

    update_data = {}
    if farm_data.name is not None:
        update_data["name"] = farm_data.name
    if farm_data.location is not None:
        update_data["location"] = farm_data.location
    if farm_data.acres is not None:
        update_data["acres"] = farm_data.acres
    if farm_data.npk is not None:
        update_data["npk"] = farm_data.npk
    if farm_data.status is not None:
        update_data["status"] = farm_data.status

    if not update_data:
        return existing

    updated = await safe_db_execute(
        request,
        "farm.update",
        where={"id": farm_id},
        data=update_data
    )
    return updated

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
