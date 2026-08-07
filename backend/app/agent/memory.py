"""
Conversation memory for the field-scoped chat. Deliberately bounded, not
an attempt at long-context memory: a sliding window of recent messages for
active reasoning, plus a rolling summary for anything older -- similar in
spirit to how ChatGPT bounds context per conversation.
"""
from groq import Groq
from prisma import Prisma

WINDOW_SIZE = 12          # most recent messages kept verbatim (~6 turns)
SUMMARIZE_THRESHOLD = 20  # once stored messages exceed this, compress the overflow

_summarizer_client = None


def get_summarizer_client():
    global _summarizer_client
    if _summarizer_client is None:
        _summarizer_client = Groq()
    return _summarizer_client


async def get_or_create_session(db: Prisma, farm_id: str):
    session = await db.chatsession.find_first(where={"farmId": farm_id})
    if session is None:
        session = await db.chatsession.create(data={"farmId": farm_id})
    return session


async def load_context(db: Prisma, session_id: str):
    """Returns (memory_summary: str | None, recent_messages: list[dict])."""
    session = await db.chatsession.find_unique(where={"id": session_id})
    all_messages = await db.chatmessage.find_many(
        where={"sessionId": session_id},
        order={"createdAt": "asc"},
    )

    recent = all_messages[-WINDOW_SIZE:]
    recent_formatted = [{"role": str(m.role), "content": m.content} for m in recent]

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
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": (
                "Summarize this farming conversation in 2-4 sentences. Keep concrete facts: "
                "crops discussed, decisions made, numbers mentioned (prices, dates, quantities). "
                "Merge with the previous summary if one is given -- describe the whole conversation "
                "so far, not just the new part."
            )},
            {"role": "user", "content": f"Previous summary: {session.memorySummary or 'None'}\n\nConversation to fold in:\n{overflow_text}"},
        ],
    )
    new_summary = response.choices[0].message.content

    await db.chatsession.update(where={"id": session_id}, data={"memorySummary": new_summary})