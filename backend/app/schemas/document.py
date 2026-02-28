from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    case_id: str
    filename: str
    file_size: int
    page_count: int | None
    status: str
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
