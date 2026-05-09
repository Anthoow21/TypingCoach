import httpx

from app.core.config import ANALYSIS_SERVICE_URL
from app.schemas.analysis import AnalyzeRequest

_client = httpx.Client(timeout=10.0)


def get_analysis_health():
    response = _client.get(f"{ANALYSIS_SERVICE_URL}/health")
    response.raise_for_status()
    return response.json()


def analyze_typing(payload: AnalyzeRequest) -> dict:
    response = _client.post(
        f"{ANALYSIS_SERVICE_URL}/analyze",
        json=payload.model_dump(),
    )
    response.raise_for_status()
    return response.json()