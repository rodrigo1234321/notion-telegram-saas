from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from backend.security import get_current_telegram_user
from backend.database import db_service

router = APIRouter(prefix="/habits", tags=["Habits"])

@router.get("/")
async def get_habits(user: Dict[str, Any] = Depends(get_current_telegram_user)):
    habits = await db_service.get_user_habits(user["telegram_id"])
    return {"status": "success", "data": habits}

@router.post("/")
async def create_habit(habit_data: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_telegram_user)):
    habit_data["telegram_id"] = user["telegram_id"]
    new_habit = await db_service.add_habit(habit_data)
    return {"status": "success", "data": new_habit}
