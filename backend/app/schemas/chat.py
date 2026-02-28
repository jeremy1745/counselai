from datetime import datetime

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    title: str = "New Conversation"


class ConversationResponse(BaseModel):
    id: str
    case_id: str
    title: str
    created_at: datetime
    archived_at: datetime | None = None

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str


class CitationResponse(BaseModel):
    source_index: int
    document_name: str
    page_numbers: list[int]
    snippet: str


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    citations: list[CitationResponse]
    created_at: datetime

    model_config = {"from_attributes": True}
