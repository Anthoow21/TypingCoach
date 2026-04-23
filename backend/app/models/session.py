from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class TypingSession(Base):
    __tablename__ = "typing_sessions"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    user_name = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default="started")
    reference_text = Column(Text, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)