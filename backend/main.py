import sys
import asyncio
import logging
import requests
from pathlib import Path
from contextlib import asynccontextmanager

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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def auto_set_webhook():
    token = settings.TELEGRAM_BOT_TOKEN
    webhook_url = settings.TELEGRAM_WEBHOOK_URL
    if token and "PLACEHOLDER" not in token and webhook_url and "localhost" not in webhook_url:
        try:
            set_url = f"https://api.telegram.org/bot{token}/setWebhook?url={webhook_url}"
            r = requests.get(set_url, timeout=5.0).json()
            logger.info(f"[Webhook Setup] Status: {r}")
        except Exception as e:
            logger.warning(f"[Webhook Setup] Notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    bot_app = create_telegram_bot_app()
    if bot_app:
        try:
            if not getattr(bot_app, "_initialized", False):
                await bot_app.initialize()
            auto_set_webhook()
            logger.info("[Startup] Telegram Bot Application initialized & webhook registered!")
        except Exception as e:
            logger.error(f"[Startup Error] Telegram Bot initialization error: {e}", exc_info=True)

    start_scheduler()
    logger.info(f"[Startup] Backend running on port {settings.PORT} [Environment: {settings.ENVIRONMENT}]")
    
    yield
    
    # Shutdown logic
    if bot_app and getattr(bot_app, "_initialized", False):
        try:
            await bot_app.shutdown()
        except Exception as e:
            logger.warning(f"[Shutdown Notice] Bot shutdown exception: {e}")


app = FastAPI(
    title="Notion-like Telegram SaaS API",
    description="Production backend powering Telegram Mini App and Gemini AI Bot",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Notion-like Telegram SaaS Backend",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/bot/debug")
async def bot_debug():
    bot_app = get_bot_app()
    token = settings.TELEGRAM_BOT_TOKEN
    token_masked = f"{token[:6]}...{token[-4:]}" if token and len(token) > 10 else "INVALID/EMPTY"
    
    status_info = {
        "bot_app_exists": bot_app is not None,
        "bot_initialized": getattr(bot_app, "_initialized", False) if bot_app else False,
        "token_configured": token and token != "TELEGRAM_BOT_TOKEN_PLACEHOLDER",
        "token_masked": token_masked,
        "webhook_url": settings.TELEGRAM_WEBHOOK_URL,
        "environment": settings.ENVIRONMENT,
        "gemini_configured": settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "GEMINI_API_KEY_PLACEHOLDER",
        "supabase_configured": settings.SUPABASE_URL and "your-project" not in settings.SUPABASE_URL
    }
    return status_info


@app.post("/bot/webhook")
async def telegram_webhook(request: Request):
    bot_app = get_bot_app()
    if not bot_app:
        logger.warning("[Webhook Warning] bot_app instance is None. Attempting lazy build...")
        bot_app = create_telegram_bot_app()
        if not bot_app:
            return {"status": "bot_not_configured"}

    # Ensure initialized
    if not getattr(bot_app, "_initialized", False):
        try:
            logger.info("[Webhook] Initializing Telegram Bot application on-demand...")
            await bot_app.initialize()
        except Exception as e:
            logger.error(f"[Webhook Error] Failed to initialize bot application: {e}")
            return {"status": "bot_init_failed", "error": str(e)}

    try:
        data = await request.json()
        logger.info(f"[Webhook Payload] Received update ID: {data.get('update_id')}")
        update = Update.de_json(data, bot_app.bot)
        if update:
            await bot_app.process_update(update)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"[Webhook Processing Error] {e}", exc_info=True)
        return {"status": "ok"}

