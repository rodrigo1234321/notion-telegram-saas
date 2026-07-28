from telegram.ext import Application, CommandHandler, MessageHandler, filters

try:
    from backend.config import settings
    from backend.bot.handlers_chat import handle_start_command, handle_text_message
except ModuleNotFoundError:
    from config import settings
    from bot.handlers_chat import handle_start_command, handle_text_message

def create_telegram_bot_app() -> Application:
    if not settings.TELEGRAM_BOT_TOKEN or "123456789" in settings.TELEGRAM_BOT_TOKEN or "PLACEHOLDER" in settings.TELEGRAM_BOT_TOKEN:
        print("[Warning] Valid TELEGRAM_BOT_TOKEN not supplied. Bot handlers initialized in dry-run mode.")
        return None

    app = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", handle_start_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message))
    return app
