from datetime import datetime

from pydantic import BaseModel, field_validator


class ExerciseCreate(BaseModel):
    title: str
    exercise_type: str
    language: str
    content: str
    difficulty: str = "easy"

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("title cannot be empty")
        return value.strip()

    @field_validator("exercise_type")
    @classmethod
    def validate_exercise_type(cls, value: str) -> str:
        allowed = {"text", "word_list"}
        if value not in allowed:
            raise ValueError("exercise_type must be 'text' or 'word_list'")
        return value

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("content cannot be empty")
        return value.strip()


class ExerciseResponse(BaseModel):
    id: int
    title: str
    exercise_type: str
    language: str
    content: str
    difficulty: str
    created_at: datetime

    class Config:
        from_attributes = True