from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from backend.security import get_current_telegram_user
from backend.database import db_service

router = APIRouter(prefix="/wiki", tags=["wiki"])


class WikiNoteCreate(BaseModel):
    title: str
    content_json: dict
    tags: Optional[List[str]] = []


class WikiNoteUpdate(BaseModel):
    title: Optional[str] = None
    content_json: Optional[dict] = None
    tags: Optional[List[str]] = None


@router.get("/notes")
async def get_notes(user: dict = Depends(get_current_telegram_user)):
    notes = await db_service.get_user_wiki(user["telegram_id"])
    return notes


@router.post("/notes")
async def create_note(note: WikiNoteCreate, user: dict = Depends(get_current_telegram_user)):
    note_data = note.model_dump()
    note_data["telegram_id"] = user["telegram_id"]
    result = await db_service.add_wiki(note_data)
    return result


@router.patch("/notes/{note_id}")
async def update_note(note_id: str, note: WikiNoteUpdate, user: dict = Depends(get_current_telegram_user)):
    update_data = {k: v for k, v in note.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = await db_service.update_wiki(note_id, user["telegram_id"], update_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(get_current_telegram_user)):
    try:
        await db_service.delete_wiki(note_id, user["telegram_id"])
        return {"status": "deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))