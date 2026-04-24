from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exercise_generator import generate_reference_text
from app.core.recommendation_engine import build_user_recommendations
from app.models.exercise import Exercise
from app.models.session import TypingSession
from app.schemas.recommendation import RecommendationResponse, StartRecommendationSessionRequest
from app.schemas.session import SessionResponse


router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/{user_name}", response_model=RecommendationResponse)
def get_recommendations(user_name: str, db: Session = Depends(get_db)):
    try:
        return build_user_recommendations(user_name, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/start", response_model=SessionResponse)
def start_recommendation_session(payload: StartRecommendationSessionRequest, db: Session = Depends(get_db)):
    exercise = Exercise(
        title=payload.title,
        exercise_type=payload.exercise_type,
        language=payload.language,
        content=payload.content,
        difficulty=payload.difficulty,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)

    try:
        reference_text = generate_reference_text(
            exercise_type=exercise.exercise_type,
            content=exercise.content,
            word_count=payload.word_count,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    session = TypingSession(
        exercise_id=exercise.id,
        user_name=payload.user_name,
        status="started",
        reference_text=reference_text,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
