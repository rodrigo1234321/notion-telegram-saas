from fastapi import APIRouter

try:
    from backend.api.endpoints import calendar, kanban, finance, habits, wiki
except ModuleNotFoundError:
    from api.endpoints import calendar, kanban, finance, habits, wiki

api_router = APIRouter(prefix="/api")

api_router.include_router(calendar.router)
api_router.include_router(kanban.router)
api_router.include_router(finance.router)
api_router.include_router(habits.router)
api_router.include_router(wiki.router)
