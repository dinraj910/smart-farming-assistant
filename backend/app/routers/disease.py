"""
Disease Detection Router — Plant Disease Identification
POST /api/v1/disease/detect

1) Accepts a multipart image upload from the mobile app.
2) Sends image bytes directly to the HuggingFace Inference API
   (linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification).
3) Feeds the top-1 label to the Groq LLM for a human-readable
   disease name, explanation, and treatment plan.
4) Returns structured JSON — no database writes needed.
"""

import io
import json
import os
import re

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, File, HTTPException, UploadFile
from groq import Groq
from pydantic import BaseModel

load_dotenv()

router = APIRouter()

# ─── Clients ──────────────────────────────────────────────────────────────────
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
HF_API_TOKEN = os.environ.get("HF_API_TOKEN", "")
HF_MODEL_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
)

GROQ_MODEL = "openai/gpt-oss-120b"

# ─── Response schema ──────────────────────────────────────────────────────────
class TreatmentStep(BaseModel):
    step: str

class DiseaseResult(BaseModel):
    raw_label: str            # Original model label e.g. "Tomato___Early_blight"
    disease_name: str         # Cleaned human readable e.g. "Tomato Early Blight"
    is_healthy: bool
    confidence: float         # 0.0 – 1.0
    confidence_pct: str       # "87%"
    explanation: str          # One-sentence plain description
    severity: str             # "None", "Mild", "Moderate", "Severe"
    severity_score: float     # 0.0 – 1.0 for the progress bar
    treatment: list[str]      # 2-3 actionable steps


def _clean_label(label: str) -> str:
    """Convert 'Tomato___Early_blight' to 'Tomato Early Blight'."""
    return label.replace("___", " ").replace("__", " ").replace("_", " ").title()


def _severity_from_label(label: str) -> tuple[str, float]:
    """
    Estimate severity from the raw label text.
    Returns (severity_text, severity_score 0-1).
    """
    lower = label.lower()
    if "healthy" in lower:
        return "None", 0.0
    if any(w in lower for w in ["early", "mild", "cercospora", "common_rust"]):
        return "Mild", 0.35
    if any(w in lower for w in ["late", "bacterial", "septoria", "mosaic", "blight"]):
        return "Moderate", 0.60
    if any(w in lower for w in ["viral", "leaf_curl", "yellow", "powdery", "rust"]):
        return "Moderate", 0.55
    return "Severe", 0.80


async def _call_huggingface(image_bytes: bytes, content_type: str) -> tuple[str, float]:
    """
    Call HuggingFace Inference API and return (top1_label, confidence).
    Raises HTTPException on failure.
    """
    token = os.environ.get("HF_API_TOKEN") or HF_API_TOKEN
    if not token:
        load_dotenv(override=True)
        token = os.environ.get("HF_API_TOKEN", "")

    if not token:
        raise HTTPException(
            status_code=503,
            detail="HF_API_TOKEN not configured. Please add it to the backend .env file.",
        )

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": content_type or "image/jpeg",
    }

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(
                HF_MODEL_URL,
                headers=headers,
                content=image_bytes,
            )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail="Could not reach HuggingFace model server. Please check internet connection.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Disease identification model request timed out. Please try again.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Network error during disease identification: {str(e)}",
        )

    if resp.status_code == 503:
        # Model loading cold-start on Hugging Face
        raise HTTPException(
            status_code=503,
            detail="Disease model is warming up on Hugging Face. Please wait ~15 seconds and try again.",
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"HuggingFace API error {resp.status_code}: {resp.text[:200]}",
        )

    data = resp.json()
    # HF classification API returns list of {label, score} sorted by score desc
    if not data or not isinstance(data, list):
        raise HTTPException(status_code=502, detail="Unexpected HuggingFace response format.")

    top = data[0]
    return top.get("label", "Unknown"), float(top.get("score", 0.0))


def _call_groq_for_explanation(label: str, confidence: float) -> dict:
    """
    Ask Groq to convert the raw classification label into:
    - disease_name (clean, human-readable)
    - explanation (1-2 sentences)
    - treatment (list of 2-3 short steps)

    Returns dict with those keys. Falls back to basic data on error.
    """
    is_healthy = "healthy" in label.lower()

    if is_healthy:
        return {
            "disease_name": "Healthy Plant",
            "explanation": (
                "No disease was detected in this leaf sample. "
                "The plant appears to be in good health. "
                "Continue your regular organic care routine."
            ),
            "treatment": [
                "Maintain regular watering and mulching schedule.",
                "Apply preventive neem-oil spray every 3 weeks.",
                "Monitor for early signs of infection during monsoon.",
            ],
        }

    prompt = f"""You are an agricultural plant pathology expert.
The ML model classified a plant leaf image as: "{label}"
Confidence: {round(confidence * 100)}%

Respond ONLY with a valid JSON object (no markdown, no extra text) in this exact format:
{{
  "disease_name": "<short clean 3-6 word disease name>",
  "explanation": "<1-2 plain sentences explaining what this disease is, how it spreads, and impact on the plant>",
  "treatment": [
    "<Step 1: specific actionable treatment>",
    "<Step 2: follow-up action>",
    "<Step 3: prevention for future>"
  ]
}}
Rules:
- disease_name should be clean English without underscores.
- explanation must be practical for a Kerala/Indian farmer.
- treatment steps must be short (under 20 words each), specific, and mention organic options where possible.
- Do NOT include any text outside the JSON object."""

    try:
        gkey = os.environ.get("GROQ_API_KEY")
        client_to_use = Groq(api_key=gkey) if gkey else groq_client
        response = client_to_use.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=400,
        )
        raw_text = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        raw_text = re.sub(r"```(?:json)?", "", raw_text).strip().strip("`").strip()

        parsed = json.loads(raw_text)
        # Validate required keys
        parsed.setdefault("disease_name", _clean_label(label))
        parsed.setdefault("explanation", f"{_clean_label(label)} detected.")
        parsed.setdefault("treatment", ["Consult your local agricultural officer."])
        return parsed

    except Exception:
        # Graceful fallback — never crash the endpoint
        return {
            "disease_name": _clean_label(label),
            "explanation": f"{_clean_label(label)} detected with {round(confidence * 100)}% confidence.",
            "treatment": [
                "Isolate affected plants immediately.",
                "Consult your local KAU agricultural extension officer.",
                "Apply organic Bordeaux mixture as a precaution.",
            ],
        }


@router.post(
    "/disease/detect",
    response_model=DiseaseResult,
    summary="Detect plant disease from leaf image",
    description=(
        "Upload a photo of a plant leaf (JPEG/PNG). "
        "Returns the detected disease name, confidence score, explanation, and treatment plan."
    ),
)
async def detect_disease(
    image: UploadFile = File(..., description="Plant leaf image (JPEG or PNG)"),
) -> DiseaseResult:
    """
    Plant disease detection endpoint.
    1. Forwards image to HuggingFace MobileNetV2 classifier.
    2. Sends top-1 label to Groq LLM for explanation + treatment.
    3. Returns structured DiseaseResult.
    """
    try:
        # Validate file type
        content_type = image.content_type or ""
        fname = (image.filename or "").lower()
        if content_type not in ("image/jpeg", "image/jpg", "image/png", "image/webp"):
            # Check filename extension if content_type is generic or octet-stream
            if any(fname.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp")):
                content_type = "image/png" if fname.endswith(".png") else "image/jpeg"
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported image type: {content_type}. Please upload a JPEG or PNG image.",
                )

        # Read image bytes (limit to 10MB)
        image_bytes = await image.read()
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large. Maximum size is 10MB.")

        # 1. Classify with HuggingFace
        raw_label, confidence = await _call_huggingface(image_bytes, content_type)
        is_healthy = "healthy" in raw_label.lower()

        # 2. Get LLM explanation + treatment
        llm_data = _call_groq_for_explanation(raw_label, confidence)

        # 3. Determine severity
        severity, severity_score = _severity_from_label(raw_label)

        confidence_pct = f"{round(confidence * 100)}%"

        return DiseaseResult(
            raw_label=raw_label,
            disease_name=llm_data["disease_name"],
            is_healthy=is_healthy,
            confidence=confidence,
            confidence_pct=confidence_pct,
            explanation=llm_data["explanation"],
            severity=severity,
            severity_score=severity_score,
            treatment=llm_data["treatment"],
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Plant disease detection failed: {str(e)}",
        )
