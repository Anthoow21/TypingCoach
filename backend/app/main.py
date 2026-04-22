from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANALYSIS_URL = os.getenv("ANALYSIS_SERVICE_URL", "http://analysis:8080")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/analysis/health")
def analysis_health():
    r = requests.get(f"{ANALYSIS_URL}/health")
    return {"analysis": r.json()}
