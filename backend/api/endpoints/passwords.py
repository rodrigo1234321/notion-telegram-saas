from fastapi import APIRouter, Depends
from typing import Dict, Any, List

try:
    from backend.security import get_current_telegram_user
    from backend.database import db_service
except ModuleNotFoundError:
    from security import get_current_telegram_user
    from database import db_service

router = APIRouter(prefix="/passwords", tags=["Passwords"])

@router.get("/")
async def get_passwords(user: Dict[str, Any] = Depends(get_current_telegram_user)):
    records = await db_service.get_user_passwords(user["telegram_id"])
    return {"status": "success", "data": records}

@router.post("/")
async def create_password(pwd_data: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_telegram_user)):
    pwd_data["telegram_id"] = user["telegram_id"]
    new_record = await db_service.add_password(pwd_data)
    return {"status": "success", "data": new_record}

@router.delete("/{pwd_id}")
async def delete_password(pwd_id: str, user: Dict[str, Any] = Depends(get_current_telegram_user)):
    await db_service.delete_password(pwd_id, user["telegram_id"])
    return {"status": "success", "message": "Password deleted"}
