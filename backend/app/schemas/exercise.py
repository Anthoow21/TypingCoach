from datetime import datetime
from pydantic import BaseModel


class ExerciseCreate(BaseModel):
    language: str
    content: str
    difficulty: str = "easy"


class ExerciseResponse(BaseModel):
    id: int
    language: str
    content: str
    difficulty: str
    created_at: datetime

    class Config:
        from_attributes = True