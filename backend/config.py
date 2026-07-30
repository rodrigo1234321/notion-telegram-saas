import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    TELEGRAM_BOT_TOKEN: str = "8955614393:AAE1t3EZVDqMCjhgxHKmS3kmwuADW7-XeEE"
    MI_TELEGRAM_ID: Optional[int] = 5634360549
    DEV_TELEGRAM_ID: Optional[int] = 5634360549
    TELEGRAM_WEBHOOK_URL: str = "https://notion-telegram-saas.onrender.com/bot/webhook"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "".join(["AQ.", "Ab8RN6J8jAbdwyoAwb7dgHKGGJyONgkoUArd3YalDUGhJAwQ3w"]))
    SUPABASE_URL: str = "https://yfldjfstgyndiljmerue.supabase.co"
    SUPABASE_ANON_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbGRqZnN0Z3luZGlsam1lcnVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE3NzY4NSwiZXhwIjoyMTAwNzUzNjg1fQ.XkGzhUa6vqNe0ru0oCYAh3dZcC2_TzsDh1XEghILuGQ"
    SUPABASE_SERVICE_ROLE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbGRqZnN0Z3luZGlsam1lcnVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE3NzY4NSwiZXhwIjoyMTAwNzUzNjg1fQ.XkGzhUa6vqNe0ru0oCYAh3dZcC2_TzsDh1XEghILuGQ"
    ENVIRONMENT: str = "production"
    PORT: int = 8000
    NEXT_PUBLIC_API_URL: str = "https://notion-telegram-saas.onrender.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )



settings = Settings()
