from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.exercise import Exercise
from app.models.result import TypingResult
from app.models.session import TypingSession
from app.schemas.result import ResultResponse
from app.schemas.session import SessionCreate, SessionComplete, SessionResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])


def compute_wpm(typed_text: str, duration_seconds: float) -> float:
    if duration_seconds <= 0:
        return 0.0
    words_typed = len(typed_text) / 5
    minutes = duration_seconds / 60
    return round(words_typed / minutes, 2)


def compute_accuracy(reference_text: str, typed_text: str, error_count: int) -> float:
    reference_length = max(len(reference_text), 1)
    accuracy = ((reference_length - error_count) / reference_length) * 100
    accuracy = max(0.0, min(100.0, accuracy))
    return round(accuracy, 2)


@router.post("/start", response_model=SessionResponse)
def start_session(payload: SessionCreate, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == payload.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    session = TypingSession(
        exercise_id=payload.exercise_id,
        user_name=payload.user_name,
        status="started"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/complete", response_model=ResultResponse)
def complete_session(session_id: int, payload: SessionComplete, db: Session = Depends(get_db)):
    session = db.query(TypingSession).filter(TypingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")

    exercise = db.query(Exercise).filter(Exercise.id == session.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    wpm = compute_wpm(payload.typed_text, payload.duration_seconds)
    accuracy = compute_accuracy(exercise.content, payload.typed_text, payload.error_count)

    result = TypingResult(
        session_id=session.id,
        wpm=wpm,
        accuracy=accuracy,
        error_count=payload.error_count
    )

    session.status = "completed"
    session.ended_at = datetime.now(UTC)

    db.add(result)
    db.commit()
    db.refresh(result)

    return result


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(TypingSession).filter(TypingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session