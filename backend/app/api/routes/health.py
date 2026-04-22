from fastapi import APIRouter, HTTPException
from app.analysis_client.client import get_analysis_health

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "backend"
    }


@router.get("/analysis/health")
def analysis_health():
    try:
        analysis_data = get_analysis_health()
        return {
            "status": "ok",
            "service": "backend",
            "analysis": analysis_data
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Analysis service unavailable: {exc}")