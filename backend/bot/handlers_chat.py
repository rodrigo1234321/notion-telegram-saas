from telegram import Update
from telegram.ext import ContextTypes
from backend.ai.engine import ai_engine

async def handle_start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    welcome_text = (
        f"🚀 ¡Hola, {user.first_name}! Bienvenido a tu **Notion-like Productivity SaaS** en Telegram.\n\n"
        "Puedes escribir o enviar audios sobre tus tareas, eventos, finanzas o hábitos, "
        "y nuestro motor de **Gemini 1.5 Flash** lo procesará automáticamente.\n\n"
        "📱 Abre la **Telegram Mini App** abajo para interactuar con tus dashboards visuales."
    )
    await update.message.reply_text(welcome_text, parse_mode="Markdown")

async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    text = update.message.text
    response_text = await ai_engine.process_message(user.id, text)
    await update.message.reply_text(response_text)
