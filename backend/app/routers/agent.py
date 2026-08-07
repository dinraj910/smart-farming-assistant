from fastapi import APIRouter, HTTPException, Request

from app.agent.memory import get_or_create_session
from app.agent.orchestrator import run_agent
from app.schemas.agent import (
    AgentRequest,
    AgentResponse,
    SessionRequest,
    SessionResponse,
)

router = APIRouter()


@router.post("/agent/sessions", response_model=SessionResponse)
async def open_chat_session(
    payload: SessionRequest,
    request: Request,
):
    """
    Creates (or returns) a chat session for a farm.
    """

    db = request.app.state.db

    session = await get_or_create_session(
        db,
        payload.farm_id,
    )

    messages = await db.chatmessage.find_many(
        where={
            "sessionId": session.id,
        },
        order={
            "createdAt": "asc",
        },
    )

    return {
        "session_id": session.id,
        "messages": [
            {
                "role": str(message.role),
                "content": message.content,
                "created_at": message.createdAt,
            }
            for message in messages
        ],
    }


@router.post(
    "/agent/crop-advisory",
    response_model=AgentResponse,
)
async def crop_advisory(
    payload: AgentRequest,
    request: Request,
):
    """
    Agentic crop advisory endpoint.
    """

    crop_model = request.app.state.crop_model
    db = request.app.state.db

    # If the caller didn't supply a session_id, create (or retrieve) one now.
    # This guarantees run_agent always receives a valid UUID, never None.
    session_id = payload.session_id
    if session_id is None:
        session = await get_or_create_session(db, payload.farm_id)
        session_id = session.id

    try:
        result = await run_agent(
            db=db,
            session_id=session_id,
            user_message=payload.message,
            crop_model=crop_model,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent failed: {e}",
        )

    return result