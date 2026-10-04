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
            
            # Robust crop extraction and markdown formatting cleanup
            import re

            def clean_markdown_text(text: Optional[str]) -> str:
                if not text:
                    return ""
                # Strip all markdown asterisks like **, ***, *, etc.
                cleaned = re.sub(r'\*+', '', text)
                # Strip underscores like __ or _
                cleaned = re.sub(r'_+', '', cleaned)
                # Strip leading bullet indicators (e.g. - , • , 1. )
                cleaned = re.sub(r'^[-•\s\d.]+', '', cleaned)
                return cleaned.strip()

            ALL_KNOWN_CROPS = [
                # 22 ML model crops (singular & plural)
                "Grapes", "Grape", "Pomegranate", "Watermelon", "Muskmelon",
                "Apple", "Orange", "Papaya", "Coconut", "Cotton", "Jute", "Coffee",
                "Rice", "Paddy", "Maize", "Chickpea", "Kidney Beans", "Kidneybeans",
                "Pigeonpeas", "Mothbeans", "Mungbean", "Blackgram", "Lentil", "Banana", "Mango",
                # Kerala crops & spices
                "Black Pepper", "Pepper", "Cardamom", "Rubber", "Tapioca", "Ginger",
                "Turmeric", "Arecanut", "Nutmeg", "Pineapple", "Vegetables", "Cowpea"
            ]

            CROP_DISPLAY_MAP = {
                "grape": "Grapes",
                "grapes": "Grapes",
                "rice": "Rice / Paddy",
                "paddy": "Rice / Paddy",
                "kidneybeans": "Kidney Beans",
                "kidney beans": "Kidney Beans",
                "black pepper": "Black Pepper",
                "pepper": "Black Pepper",
            }

            def detect_recommended_crop_from_message(msg: str) -> str:
                if not msg:
                    return "Recommended Mixed Intercrop"

                # 1. Search for explicit "Primary Recommendation", "Recommended Crop", etc.
                rec_patterns = [
                    r'(?:Primary\s+Recommendation|Recommended\s+Crop|Top\s+Recommendation|Recommended|Recommend(?:ing)?|Suggest(?:ed)?\s+Crop|Best\s+Suited\s+Crop)[:\s*]+(?:\*\*)?([A-Za-z\s/]{3,30})(?:\*\*)?',
                    r'(?:recommend(?:ed)?\s+crop\s+(?:for\s+this\s+field\s+)?is)[:\s*]+(?:\*\*)?([A-Za-z\s/]{3,30})(?:\*\*)?',
                    r'\*\*(?:Primary\s+Recommendation|Recommended\s+Crop)\*\*[:\s*]+(?:\*\*)?([A-Za-z\s/]{3,30})(?:\*\*)?',
                ]
                for pat in rec_patterns:
                    match = re.search(pat, msg, re.IGNORECASE)
                    if match:
                        raw_crop = clean_markdown_text(match.group(1)).split('\n')[0].strip()
                        # Check if any known crop is within this matched recommendation phrase
                        for c in ALL_KNOWN_CROPS:
                            if re.search(rf'\b{re.escape(c)}\b', raw_crop, re.IGNORECASE):
                                norm = c.lower()
                                return CROP_DISPLAY_MAP.get(norm, c)
                        if 2 < len(raw_crop) < 25:
                            norm = raw_crop.lower()
                            return CROP_DISPLAY_MAP.get(norm, raw_crop.title())

                # 2. Look for lines that contain "recommend" or "suitable" and match a known crop in that line
                for line in msg.split('\n'):
                    if re.search(r'\b(recommend|suitable|plant)\b', line, re.IGNORECASE):
                        for c in ALL_KNOWN_CROPS:
                            if re.search(rf'\b{re.escape(c)}\b', line, re.IGNORECASE):
                                norm = c.lower()
                                return CROP_DISPLAY_MAP.get(norm, c)

                # 3. Look for bolded crops: e.g. **Grape** or **Grapes**
                bold_matches = re.findall(r'\*\*([A-Za-z\s/]{3,25})\*\*', msg)
                for bm in bold_matches:
                    cleaned_bm = clean_markdown_text(bm)
                    for c in ALL_KNOWN_CROPS:
                        if re.search(rf'\b{re.escape(c)}\b', cleaned_bm, re.IGNORECASE):
                            norm = c.lower()
                            return CROP_DISPLAY_MAP.get(norm, c)

                # 4. Fallback to earliest occurring crop in the text
                earliest_pos = len(msg) + 1
                earliest_crop = None
                msg_lower = msg.lower()
                for c in ALL_KNOWN_CROPS:
                    m = re.search(rf'\b{re.escape(c.lower())}\b', msg_lower)
                    if m and m.start() < earliest_pos:
                        earliest_pos = m.start()
                        norm = c.lower()
                        earliest_crop = CROP_DISPLAY_MAP.get(norm, c)

                if earliest_crop:
                    return earliest_crop

                return "Recommended Mixed Intercrop"

            detected_crop = clean_markdown_text(detect_recommended_crop_from_message(latest_msg))

            # Create clean, high-value bullet takeaways from the message, completely stripping markdown asterisks
            clean_lines = []
            for l in latest_msg.split('\n'):
                stripped = l.strip()
                if len(stripped) > 15 and not stripped.startswith('#') and not stripped.startswith('|') and not stripped.startswith('---'):
                    cleaned_point = clean_markdown_text(stripped)
                    if len(cleaned_point) > 12:
                        clean_lines.append(cleaned_point)

            takeaways = clean_lines[:3] if clean_lines else [clean_markdown_text(latest_msg[:160]) + "..."]

            return {
                "hasAdvisory": True,
                "recommendedCrop": detected_crop,
                "summary": clean_markdown_text(latest_msg[:240]),
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
