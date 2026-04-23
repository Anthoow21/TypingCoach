import requests

from app.core.config import ANALYSIS_SERVICE_URL
from app.schemas.analysis import AnalyzeRequest


def get_analysis_health():
    response = requests.get(f"{ANALYSIS_SERVICE_URL}/health", timeout=5)
    response.raise_for_status()
    return response.json()


def analyze_typing(payload: AnalyzeRequest) -> dict:
    response = requests.post(
        f"{ANALYSIS_SERVICE_URL}/analyze",
        json=payload.model_dump(),
        timeout=10
    )
    response.raise_for_status()
    return response.json()