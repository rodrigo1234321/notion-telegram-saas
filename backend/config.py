import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    TELEGRAM_BOT_TOKEN: str = "TELEGRAM_BOT_TOKEN_PLACEHOLDER"
    MI_TELEGRAM_ID: Optional[int] = None
    DEV_TELEGRAM_ID: Optional[int] = None
    TELEGRAM_WEBHOOK_URL: str = "https://notion-telegram-saas.onrender.com/bot/webhook"
    GEMINI_API_KEY: str = "GEMINI_API_KEY_PLACEHOLDER"
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_ANON_KEY: str = "SUPABASE_ANON_KEY_PLACEHOLDER"
    SUPABASE_SERVICE_ROLE_KEY: str = "SUPABASE_SERVICE_ROLE_KEY_PLACEHOLDER"
    ENVIRONMENT: str = "production"
    PORT: int = 8000
    NEXT_PUBLIC_API_URL: str = "https://notion-telegram-saas.onrender.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
