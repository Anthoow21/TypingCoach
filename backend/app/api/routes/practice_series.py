from collections import Counter
from datetime import UTC, datetime
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exercise_generator import generate_reference_text
from app.models.detailed_analysis import DetailedAnalysis
from app.models.exercise import Exercise
from app.models.practice_series import PracticeSeries
from app.models.result import TypingResult
from app.models.session import TypingSession
from app.schemas.practice_series import (
    PracticeSeriesCreate,
    PracticeSeriesResponse,
    PracticeSeriesSummaryResponse,
)

router = APIRouter(prefix="/practice-series", tags=["practice-series"])


def top_n_from_counter(counter: Counter, limit: int = 5) -> list[list]:
    return [[key, value] for key, value in counter.most_common(limit)]


@router.post("", response_model=PracticeSeriesResponse)
def create_practice_series(payload: PracticeSeriesCreate, db: Session = Depends(get_db)):
    exercises = (
        db.query(Exercise)
        .filter(Exercise.exercise_type.in_(payload.exercise_modes))
        .all()
    )

    if not exercises:
        raise HTTPException(status_code=400, detail="No exercises available for selected filters")

    series = PracticeSeries(
        user_name=payload.user_name,
        total_exercises=payload.number_of_exercises,
        status="started"
    )
    db.add(series)
    db.commit()
    db.refresh(series)

    for _ in range(payload.number_of_exercises):
        exercise = random.choice(exercises)

        word_count = None
        if exercise.exercise_type == "word_list":
            if not payload.allowed_word_counts:
                raise HTTPException(status_code=400, detail="No allowed word counts provided for word list mode")
            word_count = random.choice(payload.allowed_word_counts)

        reference_text = generate_reference_text(
            exercise_type=exercise.exercise_type,
            content=exercise.content,
            word_count=word_count
        )

        session = TypingSession(
            exercise_id=exercise.id,
            practice_series_id=series.id,
            user_name=payload.user_name,
            status="started",
            reference_text=reference_text
        )
        db.add(session)

    db.commit()
    return series


@router.get("/{series_id}", response_model=PracticeSeriesResponse)
def get_practice_series(series_id: int, db: Session = Depends(get_db)):
    series = db.query(PracticeSeries).filter(PracticeSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Practice series not found")
    return series


@router.get("/{series_id}/sessions")
def get_practice_series_sessions(series_id: int, db: Session = Depends(get_db)):
    series = db.query(PracticeSeries).filter(PracticeSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Practice series not found")

    sessions = (
        db.query(TypingSession)
        .filter(TypingSession.practice_series_id == series_id)
        .order_by(TypingSession.id.asc())
        .all()
    )
    return sessions


@router.get("/{series_id}/summary", response_model=PracticeSeriesSummaryResponse)
def get_practice_series_summary(series_id: int, db: Session = Depends(get_db)):
    series = db.query(PracticeSeries).filter(PracticeSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Practice series not found")

    sessions = (
        db.query(TypingSession)
        .filter(TypingSession.practice_series_id == series_id)
        .all()
    )

    if not sessions:
        raise HTTPException(status_code=404, detail="No sessions found for this series")

    session_ids = [session.id for session in sessions]

    results = (
        db.query(TypingResult)
        .filter(TypingResult.session_id.in_(session_ids))
        .all()
    )

    analyses = (
        db.query(DetailedAnalysis)
        .filter(DetailedAnalysis.session_id.in_(session_ids))
        .all()
    )

    completed_sessions = len(results)
    average_wpm = round(sum(result.wpm for result in results) / completed_sessions, 2) if completed_sessions else 0.0
    average_accuracy = round(sum(result.accuracy for result in results) / completed_sessions, 2) if completed_sessions else 0.0
    total_errors = sum(result.error_count for result in results)

    char_counter = Counter()
    word_counter = Counter()
    bigram_counter = Counter()

    for analysis in analyses:
        payload = analysis.analysis_payload or {}
        char_counter.update(payload.get("mistakes_by_character", {}))
        word_counter.update(payload.get("weak_words", {}))
        bigram_counter.update(payload.get("weak_bigrams", {}))

    if completed_sessions == series.total_exercises and series.status != "completed":
        series.status = "completed"
        series.completed_at = datetime.now(UTC)
        db.commit()

    return PracticeSeriesSummaryResponse(
        series_id=series.id,
        total_sessions=series.total_exercises,
        completed_sessions=completed_sessions,
        average_wpm=average_wpm,
        average_accuracy=average_accuracy,
        total_errors=total_errors,
        top_characters=top_n_from_counter(char_counter, 5),
        top_words=top_n_from_counter(word_counter, 5),
        top_bigrams=top_n_from_counter(bigram_counter, 5),
    )