import os
import requests

ANALYSIS_URL = os.getenv("ANALYSIS_SERVICE_URL", "http://analysis:8080")

def get_analysis_health():
    response = requests.get(f"{ANALYSIS_URL}/health", timeout=5)
    response.raise_for_status()
    return response.json()