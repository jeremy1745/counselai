from datetime import datetime

from pydantic import BaseModel, Field


class CaseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="", max_length=5000)


class CaseResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None

    model_config = {"from_attributes": True}
