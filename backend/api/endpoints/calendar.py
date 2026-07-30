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

router = APIRouter(prefix="/calendar", tags=["calendar"])


class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    start_time: datetime
    end_time: datetime
    category: Optional[str] = "general"
    is_all_day: Optional[bool] = False
    reminder_minutes_before: Optional[int] = 15
    reminder_sent: Optional[bool] = False


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    category: Optional[str] = None
    is_all_day: Optional[bool] = None
    reminder_minutes_before: Optional[int] = None
    reminder_sent: Optional[bool] = None


@router.get("/events")
async def get_events(user: dict = Depends(get_current_telegram_user)):
    events = await db_service.get_user_events(user["telegram_id"])
    return {"status": "success", "data": events}


@router.post("/events")
async def create_event(event: CalendarEventCreate, user: dict = Depends(get_current_telegram_user)):
    event_data = event.model_dump()
    event_data["telegram_id"] = user["telegram_id"]
    result = await db_service.add_event(event_data)
    return {"status": "success", "data": result}


@router.patch("/events/{event_id}")
async def update_event(event_id: str, event: CalendarEventUpdate, user: dict = Depends(get_current_telegram_user)):
    update_data = {k: v for k, v in event.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = await db_service.update_event(event_id, user["telegram_id"], update_data)
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_current_telegram_user)):
    try:
        await db_service.delete_event(event_id, user["telegram_id"])
        return {"status": "success", "message": "Event deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))