from fastapi import APIRouter, Depends
from typing import Dict, Any, List

try:
    from backend.security import get_current_telegram_user
    from backend.database import db_service
except ModuleNotFoundError:
    from security import get_current_telegram_user
    from database import db_service

router = APIRouter(prefix="/finance", tags=["Finance"])

@router.get("/records")
async def get_records(user: Dict[str, Any] = Depends(get_current_telegram_user)):
    records = await db_service.get_user_finances(user["telegram_id"])
    return {"status": "success", "data": records}

@router.post("/records")
async def create_record(record_data: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_telegram_user)):
    record_data["telegram_id"] = user["telegram_id"]
    new_record = await db_service.add_finance(record_data)
    return {"status": "success", "data": new_record}
