from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel


class SessionRequest(BaseModel):
    """
    Used when creating a new chat session.
    Later this can reference a Farm, User, or another entity.
    """
    farm_id: str | None = None


class ChatMessageOut(BaseModel):
    role: str
    content: str
    created_at: datetime


class SessionResponse(BaseModel):
    session_id: str
    messages: List[ChatMessageOut]


class AgentRequest(BaseModel):
    message: str

    # Optional for now.
    # If omitted, the backend can create a new session.
    session_id: str | None = None

    # Keep this because your current project already has it.
    farm_id: str | None = None


class ReasoningStep(BaseModel):
    tool: str
    arguments: Dict[str, Any]
    result_summary: str


class AgentResponse(BaseModel):
    answer: str
    reasoning_trace: List[ReasoningStep]

    # Optional until the full chat system is finished.
    session_id: str | None = None