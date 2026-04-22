from fastapi import APIRouter
from app.analysis_client.client import get_analysis_health

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok", "service": "backend"}

@router.get("/analysis/health")
def analysis_health():
    analysis_data = get_analysis_health()
    return {
        "status": "ok",
        "service": "backend",
        "analysis": analysis_data
    }