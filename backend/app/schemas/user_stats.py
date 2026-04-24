from datetime import datetime

from pydantic import BaseModel


class RecentSessionStats(BaseModel):
    session_id: int
    practice_series_id: int | None
    wpm: float
    accuracy: float
    error_count: int
    created_at: datetime


class RecentSeriesStats(BaseModel):
    series_id: int
    total_exercises: int
    status: str
    created_at: datetime
    completed_at: datetime | None


class UserStatsResponse(BaseModel):
    user_name: str
    stats_scope: str
    total_sessions: int
    total_completed_sessions: int
    total_series: int
    total_completed_series: int
    average_wpm: float
    average_accuracy: float
    average_latency_mean_ms: float
    average_latency_p95_ms: float
    total_errors: int
    top_characters: list[list]
    top_words: list[list]
    top_sequences: list[list]
    top_slow_characters: list[list]
    top_slow_sequences: list[list]
    keyboard_heatmap: dict
    recent_sessions: list[RecentSessionStats]
    recent_series: list[RecentSeriesStats]
