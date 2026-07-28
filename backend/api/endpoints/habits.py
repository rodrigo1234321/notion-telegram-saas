from typing import Optional
from pydantic import BaseModel
from datetime import date
from fastapi import APIRouter, Depends, HTTPException

from backend.security import get_current_telegram_user
from backend.database import db_service

router = APIRouter(prefix="/habits", tags=["habits"])


class HabitCreate(BaseModel):
    title: str
    target_frequency: str = "daily"  # "daily", "weekly", etc.


class HabitUpdate(BaseModel):
    title: Optional[str] = None
    target_frequency: Optional[str] = None


class HabitLogCreate(BaseModel):
    completed_date: date


@router.get("/")
async def get_habits(user: dict = Depends(get_current_telegram_user)):
    habits = await db_service.get_user_habits(user["telegram_id"])
    return {"status": "success", "data": habits}


@router.post("/")
async def create_habit(habit: HabitCreate, user: dict = Depends(get_current_telegram_user)):
    habit_data = habit.model_dump()
    habit_data["telegram_id"] = user["telegram_id"]
    result = await db_service.add_habit(habit_data)
    return {"status": "success", "data": result}


@router.patch("/{habit_id}")
async def update_habit(habit_id: str, habit: HabitUpdate, user: dict = Depends(get_current_telegram_user)):
    update_data = {k: v for k, v in habit.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = await db_service.update_habit(habit_id, user["telegram_id"], update_data)
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{habit_id}")
async def delete_habit(habit_id: str, user: dict = Depends(get_current_telegram_user)):
    try:
        await db_service.delete_habit(habit_id, user["telegram_id"])
        return {"status": "success", "message": "Habit deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{habit_id}/log")
async def log_habit(habit_id: str, log: HabitLogCreate, user: dict = Depends(get_current_telegram_user)):
    try:
        result = await db_service.log_habit_completion(habit_id, user["telegram_id"], log.completed_date)
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))