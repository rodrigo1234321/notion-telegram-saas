import hmac
import hashlib
import json
import time
from typing import Dict, Any, Optional
from urllib.parse import parse_qsl, unquote
from fastapi import Header, HTTPException, Depends, Security
from fastapi.security import APIKeyHeader
from backend.config import settings

header_scheme = APIKeyHeader(name="Authorization", auto_error=False)

def validate_telegram_init_data(init_data_raw: str, bot_token: str, max_age_seconds: int = 86400) -> Dict[str, Any]:
    """
    Cryptographically verifies Telegram Mini App initData using HMAC-SHA256.
    Follows Telegram's official authentication protocol.
    """
    if not init_data_raw:
        raise ValueError("Empty initData provided")

    # Clean 'tma ' or 'Bearer ' prefix if present
    if init_data_raw.startswith("tma "):
        init_data_raw = init_data_raw[4:]
    elif init_data_raw.startswith("Bearer "):
        init_data_raw = init_data_raw[7:]

    parsed_data = dict(parse_qsl(init_data_raw, keep_blank_values=True))
    
    received_hash = parsed_data.pop("hash", None)
    if not received_hash:
        raise ValueError("Missing hash parameter in initData")

    # Verify expiration (default 24 hours)
    auth_date = int(parsed_data.get("auth_date", 0))
    if auth_date > 0 and (time.time() - auth_date > max_age_seconds):
        if settings.ENVIRONMENT == "production":
            raise ValueError("initData authentication expired")

    # Sort key-value pairs alphabetically
    data_check_lines = [f"{k}={v}" for k, v in sorted(parsed_data.items())]
    data_check_string = "\n".join(data_check_lines)

    # 1. secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token)
    secret_key = hmac.new(
        key=b"WebAppData",
        msg=bot_token.encode("utf-8"),
        digestmod=hashlib.sha256
    ).digest()

    # 2. calculated_hash = HMAC_SHA256(key=secret_key, msg=data_check_string)
    calculated_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode("utf-8"),
        digestmod=hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        if settings.ENVIRONMENT == "production":
            raise ValueError("Invalid HMAC-SHA256 signature for Telegram initData")

    # Extract user JSON
    user_json_str = parsed_data.get("user")
    if user_json_str:
        try:
            parsed_data["user_obj"] = json.loads(unquote(user_json_str))
        except Exception:
            pass

    return parsed_data

async def get_current_telegram_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    tma_init_data: Optional[str] = Header(None, alias="Telegram-Init-Data")
) -> Dict[str, Any]:
    """
    FastAPI dependency to authenticate and extract telegram_id from request headers.
    """
    raw_token = tma_init_data or authorization

    if settings.ENVIRONMENT == "development" and not raw_token:
        return {
            "telegram_id": 123456789,
            "username": "dev_user",
            "first_name": "Dev User"
        }

    if not raw_token:
        raise HTTPException(status_code=401, detail="Missing Authorization / Telegram-Init-Data header")

    try:
        validated_data = validate_telegram_init_data(raw_token, settings.TELEGRAM_BOT_TOKEN)
        user_obj = validated_data.get("user_obj", {})
        telegram_id = user_obj.get("id")
        
        if not telegram_id:
            user_raw = validated_data.get("user")
            if user_raw:
                u_dict = json.loads(user_raw)
                telegram_id = u_dict.get("id")

        if not telegram_id and settings.ENVIRONMENT == "development":
            telegram_id = 123456789

        if not telegram_id:
            raise HTTPException(status_code=401, detail="Could not resolve telegram_id from initData")

        return {
            "telegram_id": int(telegram_id),
            "username": user_obj.get("username", "user"),
            "first_name": user_obj.get("first_name", "User")
        }
    except Exception as e:
        if settings.ENVIRONMENT == "development":
            return {
                "telegram_id": 123456789,
                "username": "dev_user",
                "first_name": "Dev User"
            }
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
