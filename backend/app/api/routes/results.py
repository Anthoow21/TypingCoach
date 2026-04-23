from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.result import TypingResult
from app.models.session import TypingSession
from app.schemas.result import ResultResponse

router = APIRouter(prefix="/results", tags=["results"])


def build_result_response(result: TypingResult, session: TypingSession) -> dict:
    return {
        "id": result.id,
        "session_id": result.session_id,
        "practice_series_id": session.practice_series_id,
        "wpm": result.wpm,
        "accuracy": result.accuracy,
        "error_count": result.error_count,
        "created_at": result.created_at,
    }


@router.get("", response_model=list[ResultResponse])
def list_results(db: Session = Depends(get_db)):
    results = db.query(TypingResult).order_by(TypingResult.id.asc()).all()
    output = []

    for result in results:
        session = db.query(TypingSession).filter(TypingSession.id == result.session_id).first()
        if session:
            output.append(build_result_response(result, session))

    return output


@router.get("/{result_id}", response_model=ResultResponse)
def get_result(result_id: int, db: Session = Depends(get_db)):
    result = db.query(TypingResult).filter(TypingResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    session = db.query(TypingSession).filter(TypingSession.id == result.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return build_result_response(result, session)


@router.get("/session/{session_id}", response_model=ResultResponse)
def get_result_by_session(session_id: int, db: Session = Depends(get_db)):
    result = db.query(TypingResult).filter(TypingResult.session_id == session_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found for this session")

    session = db.query(TypingSession).filter(TypingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return build_result_response(result, session)