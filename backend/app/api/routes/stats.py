from collections import Counter
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.detailed_analysis import DetailedAnalysis
from app.models.exercise import Exercise
from app.models.practice_series import PracticeSeries
from app.models.result import TypingResult
from app.models.session import TypingSession
from app.schemas.user_stats import UserStatsResponse

router = APIRouter(prefix="/stats", tags=["stats"])

StatsScope = Literal["standard", "adaptive", "all"]


def top_n_from_counter(counter: Counter, limit: int = 5) -> list[list]:
    return [[key, value] for key, value in counter.most_common(limit)]


def merge_latency_stats(aggregate: dict[str, dict[str, float]], payload_stats: dict) -> None:
    for key, values in (payload_stats or {}).items():
        bucket = aggregate.setdefault(key, {"count": 0, "total_latency_ms": 0.0})
        bucket["count"] += int(values.get("count", 0))
        bucket["total_latency_ms"] += float(values.get("total_latency_ms", 0.0))


def top_n_latency_entries(aggregate: dict[str, dict[str, float]], limit: int = 5) -> list[list]:
    ranked = []

    for key, values in aggregate.items():
        count = int(values.get("count", 0))
        if count <= 0:
            continue

        average_latency = float(values.get("total_latency_ms", 0.0)) / count
        ranked.append([key, round(average_latency, 2)])

    ranked.sort(key=lambda item: item[1], reverse=True)
    return ranked[:limit]


def top_n_sequence_latency_entries(aggregate: dict[str, dict[str, float]], limit: int = 5) -> list[list]:
    ranked = []

    for key, values in aggregate.items():
        count = int(values.get("count", 0))
        if count <= 0:
            continue

        average_latency = float(values.get("total_latency_ms", 0.0)) / count
        ranked.append([key, round(average_latency, 2)])

    ranked.sort(key=lambda item: (-item[1], -len(item[0]), item[0].casefold()))

    selected: list[list] = []
    for candidate, latency in ranked:
        if any(candidate in existing[0] or existing[0] in candidate for existing in selected):
            continue

        selected.append([candidate, latency])
        if len(selected) >= limit:
            break

    return selected


def merge_heatmap_metrics(aggregate: dict[str, dict[str, float]], payload_heatmap: dict) -> None:
    for key, values in (payload_heatmap or {}).items():
        if key == "Backspace":
            continue
        bucket = aggregate.setdefault(key, {"hits": 0, "errors": 0, "total_latency_ms": 0.0})
        bucket["hits"] += int(values.get("hits", 0))
        bucket["errors"] += int(values.get("errors", 0))
        bucket["total_latency_ms"] += float(values.get("total_latency_ms", 0.0))


def normalize_heatmap_metrics(aggregate: dict[str, dict[str, float]]) -> dict[str, dict[str, float]]:
    normalized = {}

    for key, values in aggregate.items():
        if key == "Backspace":
            continue
        hits = int(values.get("hits", 0))
        total_latency_ms = float(values.get("total_latency_ms", 0.0))
        normalized[key] = {
            "hits": hits,
            "errors": int(values.get("errors", 0)),
            "average_latency_ms": round(total_latency_ms / hits, 2) if hits else 0.0,
        }

    return normalized


def apply_scope_to_sessions(query, scope: StatsScope):
    scoped_query = query.join(Exercise, Exercise.id == TypingSession.exercise_id)

    if scope == "adaptive":
        return scoped_query.filter(Exercise.difficulty == "adaptive")
    if scope == "standard":
        return scoped_query.filter(Exercise.difficulty != "adaptive")
    return scoped_query


def get_analysis_sequences(payload: dict) -> dict:
    return payload.get("weak_sequences") or payload.get("weak_bigrams") or {}


def get_latency_sequence_stats(payload: dict) -> dict:
    return payload.get("latency_sequence_stats") or payload.get("latency_bigram_stats") or {}


@router.get("/users")
def list_users_with_results(db: Session = Depends(get_db)):
    rows = (
        db.query(TypingSession.user_name)
        .join(TypingResult, TypingResult.session_id == TypingSession.id)
        .filter(TypingSession.user_name.isnot(None))
        .distinct()
        .order_by(TypingSession.user_name.asc())
        .all()
    )

    return [row[0] for row in rows if row[0]]


@router.get("/user/{user_name}", response_model=UserStatsResponse)
def get_user_stats(
    user_name: str,
    scope: StatsScope = Query(default="standard"),
    db: Session = Depends(get_db),
):
    normalized_user_name = user_name.strip()

    if not normalized_user_name:
        raise HTTPException(status_code=400, detail="User name cannot be empty")

    sessions = (
        apply_scope_to_sessions(
            db.query(TypingSession).filter(TypingSession.user_name == normalized_user_name),
            scope,
        )
        .order_by(TypingSession.started_at.desc())
        .all()
    )

    if not sessions:
        raise HTTPException(status_code=404, detail="No sessions found for this user")

    session_ids = [session.id for session in sessions]

    results = (
        db.query(TypingResult)
        .filter(TypingResult.session_id.in_(session_ids))
        .order_by(TypingResult.created_at.desc())
        .all()
    )

    analyses = (
        db.query(DetailedAnalysis)
        .filter(DetailedAnalysis.session_id.in_(session_ids))
        .all()
    )

    if scope == "adaptive":
        series = []
    else:
        series = (
            db.query(PracticeSeries)
            .filter(PracticeSeries.user_name == normalized_user_name)
            .order_by(PracticeSeries.created_at.desc())
            .all()
        )

    char_counter = Counter()
    word_counter = Counter()
    sequence_counter = Counter()
    latency_character_stats: dict[str, dict[str, float]] = {}
    latency_sequence_stats: dict[str, dict[str, float]] = {}
    heatmap_metrics: dict[str, dict[str, float]] = {}
    latency_mean_values = []
    latency_p95_values = []

    for analysis in analyses:
        payload = analysis.analysis_payload or {}
        char_counter.update(payload.get("mistakes_by_character", {}))
        word_counter.update(payload.get("weak_words", {}))
        sequence_counter.update(get_analysis_sequences(payload))
        merge_latency_stats(latency_character_stats, payload.get("latency_character_stats", {}))
        merge_latency_stats(latency_sequence_stats, get_latency_sequence_stats(payload))
        merge_heatmap_metrics(heatmap_metrics, payload.get("key_heatmap", {}))

        if payload.get("latency_mean_ms") is not None:
            latency_mean_values.append(float(payload.get("latency_mean_ms", 0.0)))
        if payload.get("latency_p95_ms") is not None:
            latency_p95_values.append(float(payload.get("latency_p95_ms", 0.0)))

    total_completed_sessions = len(results)
    average_wpm = round(sum(result.wpm for result in results) / total_completed_sessions, 2) if total_completed_sessions else 0.0
    average_accuracy = round(sum(result.accuracy for result in results) / total_completed_sessions, 2) if total_completed_sessions else 0.0
    total_errors = sum(result.error_count for result in results)

    session_map = {session.id: session for session in sessions}

    recent_sessions = [
        {
            "session_id": result.session_id,
            "practice_series_id": session_map[result.session_id].practice_series_id if result.session_id in session_map else None,
            "wpm": result.wpm,
            "accuracy": result.accuracy,
            "error_count": result.error_count,
            "created_at": result.created_at,
        }
        for result in results[:5]
    ]

    recent_series = [
        {
            "series_id": series_item.id,
            "total_exercises": series_item.total_exercises,
            "status": series_item.status,
            "created_at": series_item.created_at,
            "completed_at": series_item.completed_at,
        }
        for series_item in series[:5]
    ]

    return UserStatsResponse(
        user_name=normalized_user_name,
        stats_scope=scope,
        total_sessions=len(sessions),
        total_completed_sessions=total_completed_sessions,
        total_series=len(series),
        total_completed_series=sum(1 for series_item in series if series_item.status == "completed"),
        average_wpm=average_wpm,
        average_accuracy=average_accuracy,
        average_latency_mean_ms=round(sum(latency_mean_values) / len(latency_mean_values), 2) if latency_mean_values else 0.0,
        average_latency_p95_ms=round(sum(latency_p95_values) / len(latency_p95_values), 2) if latency_p95_values else 0.0,
        total_errors=total_errors,
        top_characters=top_n_from_counter(char_counter, 5),
        top_words=top_n_from_counter(word_counter, 5),
        top_sequences=top_n_from_counter(sequence_counter, 5),
        top_slow_characters=top_n_latency_entries(latency_character_stats, 5),
        top_slow_sequences=top_n_sequence_latency_entries(latency_sequence_stats, 5),
        keyboard_heatmap=normalize_heatmap_metrics(heatmap_metrics),
        recent_sessions=recent_sessions,
        recent_series=recent_series,
    )


@router.delete("/user/{user_name}")
def reset_user_stats(user_name: str, db: Session = Depends(get_db)):
    normalized_user_name = user_name.strip()

    if not normalized_user_name:
        raise HTTPException(status_code=400, detail="User name cannot be empty")

    sessions = (
        db.query(TypingSession)
        .filter(TypingSession.user_name == normalized_user_name)
        .all()
    )

    if not sessions:
        raise HTTPException(status_code=404, detail="No sessions found for this user")

    session_ids = [session.id for session in sessions]

    deleted_analyses = (
        db.query(DetailedAnalysis)
        .filter(DetailedAnalysis.session_id.in_(session_ids))
        .delete(synchronize_session=False)
    )
    deleted_results = (
        db.query(TypingResult)
        .filter(TypingResult.session_id.in_(session_ids))
        .delete(synchronize_session=False)
    )
    deleted_sessions = (
        db.query(TypingSession)
        .filter(TypingSession.id.in_(session_ids))
        .delete(synchronize_session=False)
    )
    deleted_series = (
        db.query(PracticeSeries)
        .filter(PracticeSeries.user_name == normalized_user_name)
        .delete(synchronize_session=False)
    )

    db.commit()

    return {
        "user_name": normalized_user_name,
        "deleted_sessions": deleted_sessions,
        "deleted_results": deleted_results,
        "deleted_analyses": deleted_analyses,
        "deleted_series": deleted_series,
    }
