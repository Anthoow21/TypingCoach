from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func

from app.core.database import Base


class DetailedAnalysis(Base):
    __tablename__ = "detailed_analyses"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("typing_sessions.id"), nullable=False, unique=True)
    analysis_payload = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())