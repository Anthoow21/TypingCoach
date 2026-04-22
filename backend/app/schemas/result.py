from datetime import datetime
from pydantic import BaseModel


class ResultResponse(BaseModel):
    id: int
    session_id: int
    wpm: float
    accuracy: float
    error_count: int
    created_at: datetime

    class Config:
        from_attributes = True