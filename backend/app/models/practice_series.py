from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class PracticeSeries(Base):
    __tablename__ = "practice_series"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(100), nullable=True)
    total_exercises = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="started")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)