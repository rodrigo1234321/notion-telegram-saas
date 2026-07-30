import logging
from typing import Optional
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters

try:
    from backend.config import settings
    from backend.bot.handlers_chat import handle_start_command, handle_text_message
except ModuleNotFoundError:
    from config import settings
    from bot.handlers_chat import handle_start_command, handle_text_message

logger = logging.getLogger(__name__)

_app_instance: Optional[Application] = None


def create_telegram_bot_app() -> Optional[Application]:
    global _app_instance
    if _app_instance:
        return _app_instance

    token = settings.TELEGRAM_BOT_TOKEN
    if not token or token == "TELEGRAM_BOT_TOKEN_PLACEHOLDER":
        logger.warning("[Bot Init] Valid TELEGRAM_BOT_TOKEN not supplied in environment.")
        return None

    try:
        logger.info(f"[Bot Init] Building Telegram Bot Application with token prefix '{token[:10]}...'")
        app = Application.builder().token(token).build()
        app.add_handler(CommandHandler("start", handle_start_command))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message))
        _app_instance = app
        logger.info("[Bot Init] Telegram Bot Application built successfully with handlers registered.")
        return app
    except Exception as e:
        logger.error(f"[Bot Init Error] Failed to build Telegram Bot Application: {e}", exc_info=True)
        return None


def get_bot_app() -> Optional[Application]:
    global _app_instance
    if _app_instance:
        return _app_instance
    return create_telegram_bot_app()

