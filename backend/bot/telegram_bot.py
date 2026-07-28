import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters

try:
    from backend.config import settings
    from backend.bot.handlers_chat import handle_start_command, handle_text_message
except ModuleNotFoundError:
    from config import settings
    from bot.handlers_chat import handle_start_command, handle_text_message

logger = logging.getLogger(__name__)

_app_instance: Application | None = None


def create_telegram_bot_app() -> Application | None:
    global _app_instance
    if _app_instance:
        return _app_instance

    token = settings.TELEGRAM_BOT_TOKEN
    if not token or "123456789" in token or "PLACEHOLDER" in token:
        logger.warning("[Warning] Valid TELEGRAM_BOT_TOKEN not supplied. Bot dry-run mode.")
        return None

    try:
        app = Application.builder().token(token).build()
        app.add_handler(CommandHandler("start", handle_start_command))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message))
        _app_instance = app
        logger.info("Telegram Bot Application initialized successfully.")
        return app
    except Exception as e:
        logger.error(f"Failed to build Telegram Bot Application: {e}")
        return None


def get_bot_app() -> Application | None:
    global _app_instance
    if _app_instance:
        return _app_instance
    return create_telegram_bot_app()
