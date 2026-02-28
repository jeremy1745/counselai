from datetime import datetime

from pydantic import BaseModel


class CaseCreate(BaseModel):
    name: str
    description: str = ""


class CaseResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
