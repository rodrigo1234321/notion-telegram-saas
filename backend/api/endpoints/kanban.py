from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException

try:
    from backend.security import get_current_telegram_user
    from backend.database import db_service
except ModuleNotFoundError:
    from security import get_current_telegram_user
    from database import db_service

router = APIRouter(prefix="/kanban", tags=["kanban"])


class KanbanTaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None


class KanbanTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None


@router.get("/tasks")
async def get_tasks(user: dict = Depends(get_current_telegram_user)):
    tasks = await db_service.get_user_tasks(user["telegram_id"])
    return {"status": "success", "data": tasks}


@router.post("/tasks")
async def create_task(task: KanbanTaskCreate, user: dict = Depends(get_current_telegram_user)):
    task_data = task.model_dump()
    task_data["telegram_id"] = user["telegram_id"]
    result = await db_service.add_task(task_data)
    return {"status": "success", "data": result}


@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, task: KanbanTaskUpdate, user: dict = Depends(get_current_telegram_user)):
    update_data = {k: v for k, v in task.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = await db_service.update_task(task_id, user["telegram_id"], update_data)
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_telegram_user)):
    try:
        await db_service.delete_task(task_id, user["telegram_id"])
        return {"status": "success", "message": "Task deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))