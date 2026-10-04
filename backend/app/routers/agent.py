from fastapi import APIRouter, HTTPException, Request

from app.agent.memory import get_or_create_session, is_valid_uuid
from app.agent.orchestrator import run_agent
from app.routers.auth import safe_db_execute
from app.schemas.agent import (
    AgentRequest,
    AgentResponse,
    SessionRequest,
    SessionResponse,
    TranslateRequest,
    TranslateResponse,
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
    if not db.is_connected():
        try:
            await db.connect()
        except Exception:
            pass

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
    if not db.is_connected():
        try:
            await db.connect()
        except Exception:
            pass

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


@router.post("/agent/translate", response_model=TranslateResponse)
async def translate_text(payload: TranslateRequest):
    """
    Translates advisory text into Malayalam or requested language.
    Uses Groq LLM or fallback public engine with markdown preservation.
    """
    import os
    import json
    import urllib.parse
    import urllib.request

    target_lang = payload.target_lang or "ml"
    text = (payload.text or "").strip()
    if not text:
        return {"translated_text": "", "target_lang": target_lang}

    # 1. Try Groq fast translation
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=groq_key)
            prompt = (
                "You are an expert agricultural translator for Kerala farmers. "
                "Translate the following agricultural advisory message into natural, fluent Malayalam. "
                "Keep all markdown formatting (bold, bullet points, headings, numbers, tables) intact. "
                "Output ONLY the Malayalam translation without conversational preamble.\n\n"
                f"{text}"
            )
            completion = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=1500,
            )
            translated = completion.choices[0].message.content.strip()
            if translated:
                return {"translated_text": translated, "target_lang": target_lang}
        except Exception as e:
            print("Groq translation failed, falling back to public engine:", e)

    # 2. Fallback to public translation engine
    try:
        encoded = urllib.parse.quote(text)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_lang}&dt=t&q={encoded}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                translated = "".join(item[0] for item in data[0] if item and item[0])
                return {"translated_text": translated or text, "target_lang": target_lang}
    except Exception as e:
        print("Fallback translation failed:", e)

    return {"translated_text": text, "target_lang": target_lang}