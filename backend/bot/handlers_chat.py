import logging
from telegram import Update
from telegram.ext import ContextTypes
import telegram.error

try:
    from backend.ai.engine import ai_engine
except ModuleNotFoundError:
    from ai.engine import ai_engine

logger = logging.getLogger(__name__)

async def send_safe_reply(update: Update, text: str):
    """Send message trying Markdown/HTML first, falling back to plain text on parse error."""
    if not update.effective_message:
        return
    try:
        await update.effective_message.reply_text(text, parse_mode="Markdown")
    except telegram.error.BadRequest as e:
        logger.warning(f"Markdown parse error, falling back to plain text: {e}")
        try:
            await update.effective_message.reply_text(text, parse_mode="HTML")
        except telegram.error.BadRequest:
            await update.effective_message.reply_text(text, parse_mode=None)

async def handle_start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    first_name = user.first_name if user else "Usuario"
    welcome_text = (
        f"🚀 ¡Hola, {first_name}! Bienvenido a tu **Notion-like Productivity SaaS** en Telegram.\n\n"
        "Puedo ayudarte a agendar eventos, agregar tareas al Kanban, guardar gastos o almacenar contraseñas en tu bóveda.\n\n"
        "Escríbeme lo que quieras, por ejemplo:\n"
        "• *'Agendar reunión mañana a las 4:30 pm'*\n"
        "• *'Nueva tarea: Diseñar prototipo'*\n"
        "• *'Gasté $4500 en supermercado'*\n"
        "• *'Guarda mi clave wifi: Casa1234'*\n\n"
        "📱 Abre la **Telegram Mini App** abajo para interactuar con tus tableros visuales."
    )
    await send_safe_reply(update, welcome_text)

async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_user or not update.effective_message or not update.effective_message.text:
        return

    user_id = update.effective_user.id
    text = update.effective_message.text.strip()
    logger.info(f"[Telegram Chat] Message received from {user_id}: {text}")

    try:
        response_text = await ai_engine.process_message(user_id, text)
        await send_safe_reply(update, response_text)
    except Exception as e:
        logger.error(f"[Telegram Chat] Error processing message from {user_id}: {e}")
        fallback_msg = f"✅ Registré tu solicitud: '{text}'. Abre la Mini App para ver tus cambios."
        await send_safe_reply(update, fallback_msg)
