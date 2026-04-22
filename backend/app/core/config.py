import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://typing_user:typing_password@db:5432/typing_db"
)

ANALYSIS_SERVICE_URL = os.getenv(
    "ANALYSIS_SERVICE_URL",
    "http://analysis:8080"
)