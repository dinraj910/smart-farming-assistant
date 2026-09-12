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

@router.get("/{farm_id}/advisory")
async def get_farm_advisory(farm_id: str, request: Request, current_user = Depends(get_current_user)):
    """Get the latest consolidated advisory insights and recommended crop for this plot."""
    farm = await safe_db_execute(
        request,
        "farm.find_unique",
        where={"id": farm_id}
    )
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if str(farm.userId) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this farm")

    # 1. Look for recent chat session linked to this farm
    session = await safe_db_execute(
        request,
        "chatsession.find_first",
        where={"farmId": farm_id},
        order={"updatedAt": "desc"}
    )

    if session:
        messages = await safe_db_execute(
            request,
            "chatmessage.find_many",
            where={"sessionId": session.id, "role": "assistant"},
            order={"createdAt": "desc"},
            take=3
        )
        if messages and len(messages) > 0:
            latest_msg = messages[0].content
            
            # Extract recommended crop from message
            all_known_crops = [
                "Coconut", "Banana", "Black Pepper", "Rice", "Paddy", "Cardamom", 
                "Rubber", "Coffee", "Papaya", "Mango", "Tapioca", "Ginger", "Turmeric",
                "Arecanut", "Nutmeg", "Pineapple", "Vegetables"
            ]
            detected_crop = None
            for c in all_known_crops:
                if c.lower() in latest_msg.lower():
                    detected_crop = c if c != "Rice" else "Rice / Paddy"
                    break
            
            if not detected_crop:
                import re
                bold_matches = re.findall(r'\*\*([A-Za-z\s/]{3,20})\*\*', latest_msg)
                if bold_matches:
                    detected_crop = bold_matches[0].strip()
                else:
                    detected_crop = "Recommended Mixed Intercrop"

            # Create clean, high-value bullet takeaways from the message
            clean_lines = [
                l.strip().lstrip('-*•0123456789. ').strip() 
                for l in latest_msg.split('\n') 
                if len(l.strip()) > 15 and not l.strip().startswith('#') and not l.strip().startswith('|')
            ]
            takeaways = clean_lines[:3] if clean_lines else [latest_msg[:160].strip() + "..."]

            return {
                "hasAdvisory": True,
                "recommendedCrop": detected_crop,
                "summary": latest_msg[:240],
                "takeaways": takeaways,
                "consultedAt": messages[0].createdAt.isoformat() if hasattr(messages[0], 'createdAt') and messages[0].createdAt else None,
                "source": "AI Chat History"
            }

    # 2. If no chat history yet, check if the plot has NPK telemetry to generate preliminary guidance
    npk_raw = farm.npk or ""
    import re
    n_match = re.search(r'N[:\s]*(\d+)', npk_raw, re.IGNORECASE)
    p_match = re.search(r'P[:\s]*(\d+)', npk_raw, re.IGNORECASE)
    k_match = re.search(r'K[:\s]*(\d+)', npk_raw, re.IGNORECASE)
    
    if n_match and p_match and k_match:
        n_val = int(n_match.group(1))
        p_val = int(p_match.group(1))
        k_val = int(k_match.group(1))
        
        if k_val >= 120 and n_val >= 70:
            preview_crop = "Coconut & Banana Intercrop"
            preview_takeaways = [
                f"High potassium ({k_val} ppm) and nitrogen ({n_val} ppm) strongly favor robust fruit and canopy development.",
                "Plant ahead of the southwest monsoon (May – June) for optimal root establishment.",
                "Apply organic green manure around root basins to prevent soil leaching."
            ]
        elif n_val >= 85:
            preview_crop = "Paddy / Rice (Wetland Cycle)"
            preview_takeaways = [
                f"Sufficient nitrogen ({n_val} ppm) supports tillering and grain filling.",
                "Maintain 3-5 cm standing water layer and monitor field drainage.",
                "Schedule potassium top-dressing prior to panicle initiation."
            ]
        else:
            preview_crop = "Black Pepper & Spices"
            preview_takeaways = [
                "Moderate nutrient balance is ideal for pepper vines trailing on live support trees.",
                "Ensure raised beds to avoid waterlogging and Phytophthora foot rot.",
                "Maintain soil pH near 6.0 with agricultural lime or dolomite if needed."
            ]

        return {
            "hasAdvisory": True,
            "recommendedCrop": preview_crop,
            "summary": "Telemetry-matched preliminary agronomic recommendation.",
            "takeaways": preview_takeaways,
            "consultedAt": farm.updatedAt.isoformat() if hasattr(farm, 'updatedAt') and farm.updatedAt else None,
            "source": "Soil Telemetry Match"
        }

    return {
        "hasAdvisory": False,
        "recommendedCrop": None,
        "takeaways": [],
        "source": "None"
    }

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
