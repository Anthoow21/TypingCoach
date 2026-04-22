from datetime import datetime
from pydantic import BaseModel


class SessionCreate(BaseModel):
    exercise_id: int
    user_name: str | None = None


class SessionComplete(BaseModel):
    typed_text: str
    duration_seconds: float
    error_count: int


class SessionResponse(BaseModel):
    id: int
    exercise_id: int
    user_name: str | None
    status: str
    started_at: datetime
    ended_at: datetime | None

    class Config:
        from_attributes = True