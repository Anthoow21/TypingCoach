import requests
from app.core.config import ANALYSIS_SERVICE_URL


def get_analysis_health():
    response = requests.get(f"{ANALYSIS_SERVICE_URL}/health", timeout=5)
    response.raise_for_status()
    return response.json()