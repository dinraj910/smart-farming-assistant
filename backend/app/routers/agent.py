from fastapi import APIRouter, HTTPException, Request

from app.agent.orchestrator import run_agent
from app.schemas.agent import AgentRequest, AgentResponse


router = APIRouter()


@router.post("/agent/crop-advisory", response_model=AgentResponse)
async def crop_advisory(
    payload: AgentRequest,
    request: Request,
):
    """
    The agentic endpoint.

    Existing /crop-recommendation endpoint (Model 1 only)
    stays untouched as a fast, simple fallback path.
    """

    crop_model = request.app.state.crop_model

    try:
        result = await run_agent(
            payload.message,
            crop_model,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent failed: {e}",
        )

    return result