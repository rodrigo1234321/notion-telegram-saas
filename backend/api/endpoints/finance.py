from typing import Optional
from pydantic import BaseModel
from datetime import date
from fastapi import APIRouter, Depends, HTTPException

try:
    from backend.security import get_current_telegram_user
    from backend.database import db_service
except ModuleNotFoundError:
    from security import get_current_telegram_user
    from database import db_service

router = APIRouter(prefix="/finance", tags=["finance"])


class FinanceRecordCreate(BaseModel):
    type: str  # "income" or "expense"
    amount: float
    category: str
    description: Optional[str] = ""
    record_date: date


class FinanceRecordUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    record_date: Optional[date] = None


@router.get("/records")
async def get_records(user: dict = Depends(get_current_telegram_user)):
    records = await db_service.get_user_finances(user["telegram_id"])
    return {"status": "success", "data": records}


@router.post("/records")
async def create_record(record: FinanceRecordCreate, user: dict = Depends(get_current_telegram_user)):
    record_data = record.model_dump()
    record_data["telegram_id"] = user["telegram_id"]
    result = await db_service.add_finance(record_data)
    return {"status": "success", "data": result}


@router.patch("/records/{record_id}")
async def update_record(record_id: str, record: FinanceRecordUpdate, user: dict = Depends(get_current_telegram_user)):
    update_data = {k: v for k, v in record.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = await db_service.update_finance(record_id, user["telegram_id"], update_data)
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/records/{record_id}")
async def delete_record(record_id: str, user: dict = Depends(get_current_telegram_user)):
    try:
        await db_service.delete_finance(record_id, user["telegram_id"])
        return {"status": "success", "message": "Record deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))