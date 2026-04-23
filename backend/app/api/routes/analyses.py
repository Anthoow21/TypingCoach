from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.detailed_analysis import DetailedAnalysis
from app.schemas.analysis import DetailedAnalysisResponse

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.get("", response_model=list[DetailedAnalysisResponse])
def list_analyses(db: Session = Depends(get_db)):
    return db.query(DetailedAnalysis).order_by(DetailedAnalysis.id.asc()).all()


@router.get("/session/{session_id}", response_model=DetailedAnalysisResponse)
def get_analysis_by_session(session_id: int, db: Session = Depends(get_db)):
    analysis = (
        db.query(DetailedAnalysis)
        .filter(DetailedAnalysis.session_id == session_id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Detailed analysis not found for this session")
    return analysis