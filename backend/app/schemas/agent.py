from typing import Any, Dict, List

from pydantic import BaseModel


class AgentRequest(BaseModel):
    message: str
    farm_id: str | None = None


class ReasoningStep(BaseModel):
    tool: str
    arguments: Dict[str, Any]
    result_summary: str


class AgentResponse(BaseModel):
    answer: str
    reasoning_trace: List[ReasoningStep]