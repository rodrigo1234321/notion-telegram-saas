from fastapi import APIRouter, Depends
from typing import Dict, Any, List

try:
    from backend.security import get_current_telegram_user
    from backend.database import db_service
except ModuleNotFoundError:
    from security import get_current_telegram_user
    from database import db_service

router = APIRouter(prefix="/kanban", tags=["Kanban"])

@router.get("/tasks")
async def get_tasks(user: Dict[str, Any] = Depends(get_current_telegram_user)):
    tasks = await db_service.get_user_tasks(user["telegram_id"])
    return {"status": "success", "data": tasks}

@router.post("/tasks")
async def create_task(task_data: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_telegram_user)):
    task_data["telegram_id"] = user["telegram_id"]
    new_task = await db_service.add_task(task_data)
    return {"status": "success", "data": new_task}
