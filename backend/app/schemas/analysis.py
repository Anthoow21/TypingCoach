from datetime import datetime
from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    reference_text: str
    typed_text: str
    duration_seconds: float
    error_count: int


class AnalyzeResponse(BaseModel):
    wpm: float
    accuracy: float
    error_count: int
    mistakes_by_character: dict[str, int]
    weak_words: dict[str, int]
    weak_bigrams: dict[str, int]
    suggested_focus: list[str]


class DetailedAnalysisResponse(BaseModel):
    id: int
    session_id: int
    analysis_payload: dict
    created_at: datetime

    class Config:
        from_attributes = True