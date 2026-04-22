from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.result import TypingResult
from app.schemas.result import ResultResponse

router = APIRouter(prefix="/results", tags=["results"])


@router.get("", response_model=list[ResultResponse])
def list_results(db: Session = Depends(get_db)):
    return db.query(TypingResult).order_by(TypingResult.id.asc()).all()


@router.get("/{result_id}", response_model=ResultResponse)
def get_result(result_id: int, db: Session = Depends(get_db)):
    result = db.query(TypingResult).filter(TypingResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result


@router.get("/session/{session_id}", response_model=ResultResponse)
def get_result_by_session(session_id: int, db: Session = Depends(get_db)):
    result = db.query(TypingResult).filter(TypingResult.session_id == session_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found for this session")
    return result