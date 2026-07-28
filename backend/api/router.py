from fastapi import APIRouter

try:
    from backend.api.endpoints import calendar, kanban, finance, habits, wiki, users, reviews
except ModuleNotFoundError:
    from api.endpoints import calendar, kanban, finance, habits, wiki, users, reviews

api_router = APIRouter(prefix="/api")

api_router.include_router(calendar.router)
api_router.include_router(kanban.router)
api_router.include_router(finance.router)
api_router.include_router(habits.router)
api_router.include_router(wiki.router)
api_router.include_router(users.router)
api_router.include_router(reviews.router)
