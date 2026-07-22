from typing import Any, Optional

from pydantic import BaseModel, Field


class ChatCitation(BaseModel):
    document_name: str
    page: str
    excerpt: str
    score: Optional[float] = None


class ChatMessage(BaseModel):
    id: int
    project_id: int
    role: str
    content: str
    citations: list[ChatCitation] = Field(default_factory=list)
    created_at: Optional[str] = None


class ChatAskRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=4000)


class ChatAskResponse(BaseModel):
    answer: ChatMessage
    citations: list[ChatCitation] = Field(default_factory=list)
