from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseCreate, ExerciseResponse

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.post("", response_model=ExerciseResponse)
def create_exercise(payload: ExerciseCreate, db: Session = Depends(get_db)):
    exercise = Exercise(
        exercise_type=payload.exercise_type,
        language=payload.language,
        content=payload.content,
        difficulty=payload.difficulty
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.get("", response_model=list[ExerciseResponse])
def list_exercises(db: Session = Depends(get_db)):
    return db.query(Exercise).order_by(Exercise.id.asc()).all()


@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise