from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func
from app.core.database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    language = Column(String(10), nullable=False)
    content = Column(Text, nullable=False)
    difficulty = Column(String(20), nullable=False, default="easy")
    created_at = Column(DateTime(timezone=True), server_default=func.now())