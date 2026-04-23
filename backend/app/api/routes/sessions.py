from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.analysis_client.client import analyze_typing
from app.core.database import get_db
from app.core.exercise_generator import generate_reference_text
from app.models.detailed_analysis import DetailedAnalysis
from app.models.exercise import Exercise
from app.models.result import TypingResult
from app.models.session import TypingSession
from app.schemas.analysis import AnalyzeRequest
from app.schemas.result import ResultResponse
from app.schemas.session import SessionComplete, SessionCreate, SessionResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/start", response_model=SessionResponse)
def start_session(payload: SessionCreate, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == payload.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    try:
        reference_text = generate_reference_text(
            exercise_type=exercise.exercise_type,
            content=exercise.content,
            word_count=payload.word_count
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    session = TypingSession(
        exercise_id=payload.exercise_id,
        user_name=payload.user_name,
        status="started",
        reference_text=reference_text
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

    analysis_request = AnalyzeRequest(
        reference_text=session.reference_text,
        typed_text=payload.typed_text,
        duration_seconds=payload.duration_seconds,
        error_count=payload.error_count,
        error_events=payload.error_events
    )

    try:
        analysis_data = analyze_typing(analysis_request)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Analysis service unavailable: {exc}")

    result = TypingResult(
        session_id=session.id,
        wpm=analysis_data["wpm"],
        accuracy=analysis_data["accuracy"],
        error_count=analysis_data["error_count"]
    )

    detailed_analysis = DetailedAnalysis(
        session_id=session.id,
        analysis_payload=analysis_data
    )

    session.status = "completed"
    session.ended_at = datetime.now(UTC)

    db.add(result)
    db.add(detailed_analysis)
    db.commit()
    db.refresh(result)

    return result


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(TypingSession).filter(TypingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session