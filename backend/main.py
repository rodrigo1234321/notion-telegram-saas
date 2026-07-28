import sys
import asyncio
import logging
import requests
from pathlib import Path

# Add both current dir and parent root dir to sys.path
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from telegram import Update

try:
    from backend.config import settings
    from backend.api.router import api_router
    from backend.bot.telegram_bot import create_telegram_bot_app, get_bot_app
    from backend.bot.scheduler import start_scheduler
except ModuleNotFoundError:
    from config import settings
    from api.router import api_router
    from bot.telegram_bot import create_telegram_bot_app, get_bot_app
    from bot.scheduler import start_scheduler

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Notion-like Telegram SaaS API",
    description="Production backend powering Telegram Mini App and Gemini AI Bot",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

def auto_set_webhook():
    token = settings.TELEGRAM_BOT_TOKEN
    webhook_url = settings.TELEGRAM_WEBHOOK_URL
    if token and "PLACEHOLDER" not in token and webhook_url and "localhost" not in webhook_url:
        try:
            set_url = f"https://api.telegram.org/bot{token}/setWebhook?url={webhook_url}"
            r = requests.get(set_url, timeout=5.0).json()
            logger.info(f"Auto setWebhook status: {r}")
        except Exception as e:
            logger.warning(f"Failed to auto-set webhook: {e}")

@app.on_event("startup")
async def on_startup():
    start_scheduler()
    bot_app = create_telegram_bot_app()
    if bot_app:
        try:
            await bot_app.initialize()
            auto_set_webhook()
            logger.info("Telegram Bot Application initialized & webhook registered successfully!")
        except Exception as e:
            logger.warning(f"Telegram Bot initialization notice: {e}")
    
    print(f"Backend service running on port {settings.PORT} [Environment: {settings.ENVIRONMENT}]")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Notion-like Telegram SaaS Backend",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.post("/bot/webhook")
async def telegram_webhook(request: Request):
    bot_app = get_bot_app()
    if not bot_app:
        return {"status": "bot_not_configured"}

    try:
        data = await request.json()
        update = Update.de_json(data, bot_app.bot)
        if update:
            await bot_app.process_update(update)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing webhook update: {e}")
        return {"status": "error", "detail": str(e)}
