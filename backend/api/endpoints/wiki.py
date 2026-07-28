from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from backend.security import get_current_telegram_user
from backend.database import db_service

router = APIRouter(prefix="/wiki", tags=["Wiki"])

@router.get("/notes")
async def get_notes(user: Dict[str, Any] = Depends(get_current_telegram_user)):
    notes = await db_service.get_user_wiki(user["telegram_id"])
    return {"status": "success", "data": notes}

@router.post("/notes")
async def create_note(note_data: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_telegram_user)):
    note_data["telegram_id"] = user["telegram_id"]
    new_note = await db_service.add_wiki(note_data)
    return {"status": "success", "data": new_note}
