from datetime import datetime
from pydantic import BaseModel, Field


class ErrorEvent(BaseModel):
    index: int
    expected_char: str
    typed_char: str


class KeyEvent(BaseModel):
    key: str
    expected_char: str | None = None
    position: int
    timestamp_ms: int
    event_type: str
    is_error: bool = False
    is_correction: bool = False


class AggregateLatencyStat(BaseModel):
    count: int
    total_latency_ms: float


class HeatmapKeyStat(BaseModel):
    hits: int
    errors: int
    total_latency_ms: float


class AnalyzeRequest(BaseModel):
    reference_text: str
    typed_text: str
    duration_seconds: float
    error_count: int
    error_events: list[ErrorEvent]
    key_events: list[KeyEvent] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    wpm: float
    accuracy: float
    error_count: int
    latency_mean_ms: float
    latency_median_ms: float
    latency_p95_ms: float
    backspace_count: int
    mistakes_by_character: dict[str, int]
    weak_words: dict[str, int]
    weak_sequences: dict[str, int]
    slow_characters: list[list]
    slow_sequences: list[list]
    key_heatmap: dict[str, HeatmapKeyStat]
    latency_character_stats: dict[str, AggregateLatencyStat]
    latency_sequence_stats: dict[str, AggregateLatencyStat]
    suggested_focus: list[str]


class DetailedAnalysisResponse(BaseModel):
    id: int
    session_id: int
    analysis_payload: dict
    created_at: datetime

    class Config:
        from_attributes = True
