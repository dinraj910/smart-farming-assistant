"""
Conversation memory for the field-scoped chat. Deliberately bounded, not
an attempt at long-context memory: a sliding window of recent messages for
active reasoning, plus a rolling summary for anything older -- similar in
spirit to how ChatGPT bounds context per conversation.
"""
from google import genai
from prisma import Prisma

WINDOW_SIZE = 12          # most recent messages kept verbatim (~6 turns)
SUMMARIZE_THRESHOLD = 20  # once stored messages exceed this, compress the overflow

_summarizer_client = None


def get_summarizer_client():
    global _summarizer_client
    if _summarizer_client is None:
        _summarizer_client = genai.Client()
    return _summarizer_client


async def get_or_create_session(db: Prisma, farm_id: str | None):
    # When farm_id is provided, look for an existing session for that farm.
    # When it is None (anonymous request), always create a fresh session.
    if farm_id is not None:
        session = await db.chatsession.find_first(where={"farmId": farm_id})
    else:
        session = None  # anonymous — always create a new one

    if session is None:
        data = {"farmId": farm_id} if farm_id is not None else {}
        session = await db.chatsession.create(data=data)
    return session


async def load_context(db: Prisma, session_id: str):
    """Returns (memory_summary: str | None, recent_messages: list[dict])."""
    session = await db.chatsession.find_unique(where={"id": session_id})

    # Session may not exist yet (first call) — return empty context.
    if session is None:
        return None, []

    all_messages = await db.chatmessage.find_many(
        where={"sessionId": session_id},
        order={"createdAt": "asc"},
    )

    recent = all_messages[-WINDOW_SIZE:]
    recent_formatted = [
        {
            "role": m.role.value if hasattr(m.role, "value") else str(m.role).split(".")[-1],
            "content": m.content,
        }
        for m in recent
    ]

    return session.memorySummary, recent_formatted


async def save_turn(db: Prisma, session_id: str, user_message: str, assistant_message: str):
    await db.chatmessage.create(data={
        "sessionId": session_id, "role": "user", "content": user_message,
    })
    await db.chatmessage.create(data={
        "sessionId": session_id, "role": "assistant", "content": assistant_message,
    })


async def maybe_summarize(db: Prisma, session_id: str):
    session = await db.chatsession.find_unique(where={"id": session_id})
    all_messages = await db.chatmessage.find_many(
        where={"sessionId": session_id},
        order={"createdAt": "asc"},
    )

    if len(all_messages) <= SUMMARIZE_THRESHOLD:
        return  # nothing to compress yet

    overflow = all_messages[:-WINDOW_SIZE]  # everything outside the active window
    overflow_text = "\n".join(f"{m.role}: {m.content}" for m in overflow)

    client = get_summarizer_client()
    sys_prompt = (
        "Summarize this farming conversation in 2-4 sentences. Keep concrete facts: "
        "crops discussed, decisions made, numbers mentioned (prices, dates, quantities). "
        "Merge with the previous summary if one is given -- describe the whole conversation "
        "so far, not just the new part."
    )
    user_msg = f"Previous summary: {session.memorySummary or 'None'}\n\nConversation to fold in:\n{overflow_text}"
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_msg,
        config=genai.types.GenerateContentConfig(system_instruction=sys_prompt),
    )
    new_summary = response.text

    await db.chatsession.update(where={"id": session_id}, data={"memorySummary": new_summary})