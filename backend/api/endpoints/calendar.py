from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from backend.security import get_current_telegram_user
from backend.database import db_service

router = APIRouter(prefix="/calendar", tags=["Calendar"])

@router.get("/events")
async def get_events(user: Dict[str, Any] = Depends(get_current_telegram_user)):
    events = await db_service.get_user_events(user["telegram_id"])
    return {"status": "success", "data": events}

@router.post("/events")
async def create_event(event_data: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_telegram_user)):
    event_data["telegram_id"] = user["telegram_id"]
    new_event = await db_service.add_event(event_data)
    return {"status": "success", "data": new_event}
