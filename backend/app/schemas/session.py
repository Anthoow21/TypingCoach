from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.analysis import ErrorEvent, KeyEvent


class SessionCreate(BaseModel):
    exercise_id: int
    user_name: str
    word_count: int | None = None

    @field_validator("user_name")
    @classmethod
    def validate_user_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("user_name is required")
        return normalized

    @field_validator("word_count")
    @classmethod
    def validate_word_count(cls, value: int | None) -> int | None:
        if value is None:
            return value
        if value < 25 or value > 100:
            raise ValueError("word_count must be between 25 and 100")
        return value


class SessionComplete(BaseModel):
    typed_text: str
    duration_seconds: float
    error_count: int
    error_events: list[ErrorEvent]
    key_events: list[KeyEvent] = Field(default_factory=list)


class SessionResponse(BaseModel):
    id: int
    exercise_id: int
    user_name: str | None
    status: str
    reference_text: str
    started_at: datetime
    ended_at: datetime | None

    class Config:
        from_attributes = True
