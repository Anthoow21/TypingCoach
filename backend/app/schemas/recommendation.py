from pydantic import BaseModel, field_validator


class TargetedExerciseRecommendation(BaseModel):
    title: str
    exercise_type: str
    language: str
    content: str
    difficulty: str = "adaptive"
    word_count: int = 25
    focus_labels: list[str]
    rationale: str


class WeaknessSummary(BaseModel):
    top_error_characters: list[str]
    top_error_sequences: list[str]
    top_slow_characters: list[str]
    top_slow_sequences: list[str]


class RecommendationResponse(BaseModel):
    user_name: str
    eligible: bool
    completed_sessions: int
    minimum_sessions_required: int = 10
    sessions_remaining: int
    message: str
    weakness_summary: WeaknessSummary
    recommendations: list[TargetedExerciseRecommendation]


class StartRecommendationSessionRequest(BaseModel):
    user_name: str
    title: str
    exercise_type: str
    language: str = "fr"
    content: str
    difficulty: str = "adaptive"
    word_count: int = 25

    @field_validator("user_name", "title", "content")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("field cannot be empty")
        return normalized
