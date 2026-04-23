from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.exercises import router as exercises_router
from app.api.routes.sessions import router as sessions_router
from app.api.routes.results import router as results_router
from app.api.routes.analyses import router as analyses_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(exercises_router)
api_router.include_router(sessions_router)
api_router.include_router(results_router)
api_router.include_router(analyses_router)