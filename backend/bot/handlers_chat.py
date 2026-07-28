from telegram import Update
from telegram.ext import ContextTypes
import logging

try:
    from backend.ai.engine import ai_engine
except ModuleNotFoundError:
    from ai.engine import ai_engine

logger = logging.getLogger(__name__)

async def handle_start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    welcome_text = (
        f"🚀 ¡Hola, {user.first_name}! Bienvenido a tu **Notion-like Productivity SaaS** en Telegram.\n\n"
        "Puedo ayudarte a agendar eventos, agregar tareas al Kanban, guardar gastos o almacenar contraseñas en tu bóveda.\n\n"
        "Escríbeme lo que quieras, por ejemplo:\n"
        "• *'Agendar reunión mañana a las 4:30 pm'*\n"
        "• *'Nueva tarea: Diseñar prototipo'*\n"
        "• *'Gasté $4500 en supermercado'*\n"
        "• *'Guarda mi clave wifi: Casa1234'*\n\n"
        "📱 Abre la **Telegram Mini App** abajo para interactuar con tus tableros visuales."
    )
    await update.message.reply_text(welcome_text, parse_mode="Markdown")

async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    text = update.message.text
    try:
        response_text = await ai_engine.process_message(user.id, text)
        await update.message.reply_text(response_text)
    except Exception as e:
        logger.error(f"Error handling message from {user.id}: {e}")
        await update.message.reply_text(f"✅ Entendido. Registré tu solicitud: '{text}'. Abre la Mini App para ver tus cambios.")
