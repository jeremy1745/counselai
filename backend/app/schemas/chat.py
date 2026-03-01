from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: str = Field(default="New Conversation", min_length=1, max_length=255)


class ConversationResponse(BaseModel):
    id: str
    case_id: str
    title: str
    created_at: datetime
    archived_at: datetime | None = None

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=50000)


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
