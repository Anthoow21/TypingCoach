from datetime import datetime
from pydantic import BaseModel


class ResultResponse(BaseModel):
    id: int
    session_id: int
    practice_series_id: int | None
    wpm: float
    accuracy: float
    error_count: int
    created_at: datetime

    class Config:
        from_attributes = True