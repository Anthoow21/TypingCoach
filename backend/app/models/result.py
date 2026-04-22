from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer
from sqlalchemy.sql import func
from app.core.database import Base


class TypingResult(Base):
    __tablename__ = "typing_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("typing_sessions.id"), nullable=False, unique=True)
    wpm = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=False)
    error_count = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())