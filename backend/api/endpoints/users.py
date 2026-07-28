from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

try:
    from backend.security import get_current_telegram_user
    from backend.database import db_service
except ModuleNotFoundError:
    from security import get_current_telegram_user
    from database import db_service

router = APIRouter(prefix="/users", tags=["users"])


class UserPreferencesUpdate(BaseModel):
    timezone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    theme: Optional[str] = None
    font_scale: Optional[str] = None


@router.get("/me")
async def get_me(user: dict = Depends(get_current_telegram_user)):
    """Get current user profile."""
    profile = await db_service.get_user(user["telegram_id"])
    if not profile:
        # Auto-create user on first request
        profile = await db_service.upsert_user(
            telegram_id=user["telegram_id"],
            username=user.get("username", ""),
            first_name=user.get("first_name", ""),
        )
    return {"status": "success", "data": profile}


@router.patch("/preferences")
async def update_preferences(prefs: UserPreferencesUpdate, user: dict = Depends(get_current_telegram_user)):
    """Update user preferences (location, timezone, theme, font scale)."""
    update_data = {k: v for k, v in prefs.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = await db_service.update_user_preferences(user["telegram_id"], update_data)
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
