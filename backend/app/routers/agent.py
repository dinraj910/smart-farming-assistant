from fastapi import APIRouter, HTTPException, Request

from app.agent.memory import get_or_create_session, is_valid_uuid
from app.agent.orchestrator import run_agent
from app.routers.auth import safe_db_execute
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

    messages = await safe_db_execute(
        request,
        "chatmessage.find_many",
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
            for message in (messages or [])
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
    elif payload.farm_id and is_valid_uuid(payload.farm_id):
        try:
            sess = await safe_db_execute(request, "chatsession.find_unique", where={"id": session_id})
            if sess and not sess.farmId:
                await safe_db_execute(request, "chatsession.update", where={"id": session_id}, data={"farmId": payload.farm_id})
        except Exception:
            pass

    # Fetch farm info from DB if farm_id or session has farmId
    farm_info = None
    target_farm_id = payload.farm_id if is_valid_uuid(payload.farm_id) else None
    if not target_farm_id and session_id:
        try:
            sess = await safe_db_execute(request, "chatsession.find_unique", where={"id": session_id})
            if sess and sess.farmId:
                target_farm_id = str(sess.farmId)
        except Exception:
            pass

    if target_farm_id:
        try:
            farm_rec = await safe_db_execute(request, "farm.find_unique", where={"id": target_farm_id})
            if farm_rec:
                farm_info = {
                    "name": farm_rec.name,
                    "location": farm_rec.location,
                    "acres": farm_rec.acres,
                    "npk": farm_rec.npk,
                    "status": farm_rec.status,
                }
        except Exception as ex:
            print("Failed to fetch farm context:", ex)

    try:
        result = await run_agent(
            db=db,
            session_id=session_id,
            user_message=payload.message,
            crop_model=crop_model,
            farm_info=farm_info,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent failed: {e}",
        )

    return result