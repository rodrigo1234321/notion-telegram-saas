from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

try:
    from backend.security import get_current_telegram_user
    from backend.database import db_service
except ModuleNotFoundError:
    from security import get_current_telegram_user
    from database import db_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewCreate(BaseModel):
    place_name: str
    latitude: float
    longitude: float
    rating: int  # 1-5
    comment: Optional[str] = ""


@router.get("/")
async def get_reviews(user: dict = Depends(get_current_telegram_user)):
    """Get all reviews for the current user."""
    if db_service.has_supabase:
        res = db_service.client.table("local_reviews").select("*").eq("telegram_id", user["telegram_id"]).order("created_at", desc=True).execute()
        return {"status": "success", "data": res.data or []}
    # In-memory fallback
    from backend.database import IN_MEMORY_DB
    reviews = [r for r in IN_MEMORY_DB.get("local_reviews", []) if r.get("telegram_id") == user["telegram_id"]]
    return {"status": "success", "data": reviews}


@router.post("/")
async def create_review(review: ReviewCreate, user: dict = Depends(get_current_telegram_user)):
    """Create a new review."""
    review_data = review.model_dump()
    review_data["telegram_id"] = user["telegram_id"]

    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    if db_service.has_supabase:
        res = db_service.client.table("local_reviews").insert(review_data).execute()
        return {"status": "success", "data": res.data[0] if res.data else review_data}

    # In-memory fallback
    import uuid
    from backend.database import IN_MEMORY_DB
    review_data["id"] = str(uuid.uuid4())
    IN_MEMORY_DB.setdefault("local_reviews", []).append(review_data)
    return {"status": "success", "data": review_data}


@router.delete("/{review_id}")
async def delete_review(review_id: str, user: dict = Depends(get_current_telegram_user)):
    """Delete a review."""
    if db_service.has_supabase:
        res = db_service.client.table("local_reviews").delete().eq("id", review_id).eq("telegram_id", user["telegram_id"]).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Review not found or access denied")
        return {"status": "success", "message": "Review deleted"}

    # In-memory fallback
    from backend.database import IN_MEMORY_DB
    for i, r in enumerate(IN_MEMORY_DB.get("local_reviews", [])):
        if r["id"] == review_id and r.get("telegram_id") == user["telegram_id"]:
            IN_MEMORY_DB["local_reviews"].pop(i)
            return {"status": "success", "message": "Review deleted"}
    raise HTTPException(status_code=404, detail="Review not found or access denied")
