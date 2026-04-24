from datetime import datetime
from pydantic import BaseModel


class ResultResponse(BaseModel):
    id: int
    session_id: int
    exercise_id: int | None = None
    user_name: str | None = None
    practice_series_id: int | None
    exercise_title: str | None = None
    exercise_type: str | None = None
    exercise_difficulty: str | None = None
    wpm: float
    accuracy: float
    error_count: int
    created_at: datetime

    class Config:
        from_attributes = True
