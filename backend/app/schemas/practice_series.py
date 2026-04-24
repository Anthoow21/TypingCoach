from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class PracticeSeriesCreate(BaseModel):
    user_name: str
    number_of_exercises: int
    exercise_modes: list[str] = Field(default_factory=lambda: ["text", "word_list"])
    allowed_word_counts: list[int] = Field(default_factory=lambda: [25, 40, 50, 75, 100])

    @field_validator("user_name")
    @classmethod
    def validate_user_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("user_name is required")
        return normalized

    @field_validator("number_of_exercises")
    @classmethod
    def validate_number_of_exercises(cls, value: int) -> int:
        if value < 1 or value > 20:
            raise ValueError("number_of_exercises must be between 1 and 20")
        return value

    @field_validator("exercise_modes")
    @classmethod
    def validate_exercise_modes(cls, value: list[str]) -> list[str]:
        allowed = {"text", "word_list"}
        if not value:
            raise ValueError("exercise_modes cannot be empty")
        if any(item not in allowed for item in value):
            raise ValueError("exercise_modes must contain only 'text' and/or 'word_list'")
        return value

    @field_validator("allowed_word_counts")
    @classmethod
    def validate_allowed_word_counts(cls, value: list[int]) -> list[int]:
        allowed = {25, 40, 50, 75, 100}
        if any(item not in allowed for item in value):
          raise ValueError("allowed_word_counts must contain only 25, 40, 50, 75, 100")
        return value


class PracticeSeriesResponse(BaseModel):
    id: int
    user_name: str | None
    total_exercises: int
    status: str
    created_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


class PracticeSeriesSummaryResponse(BaseModel):
    series_id: int
    total_sessions: int
    completed_sessions: int
    average_wpm: float
    average_accuracy: float
    total_errors: int
    top_characters: list[list]
    top_words: list[list]
    top_sequences: list[list]
