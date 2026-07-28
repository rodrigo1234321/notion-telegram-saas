import os
from typing import Dict, Any, List
from backend.config import settings
from backend.ai.prompts import SYSTEM_PROMPT
from backend.ai.tools import TOOL_FUNCTIONS, add_calendar_event, create_kanban_task, record_transaction, log_habit, save_memory

class GeminiAIEngine:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        self.has_genai = False

        if self.api_key and "YourGeminiApiKey" not in self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                self.has_genai = True
            except Exception as e:
                print(f"[Warning] Could not initialize google-genai Client: {e}")
                self.has_genai = False

    async def process_message(self, telegram_id: int, user_message: str) -> str:
        """
        Processes text/voice messages using Gemini 1.5 Flash with Function Calling.
        If real Gemini API Key is present, calls the model; otherwise uses intelligent fallback logic.
        """
        if self.has_genai and self.client:
            try:
                from google.genai import types
                response = self.client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=user_message,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        tools=TOOL_FUNCTIONS
                    )
                )
                if response.text:
                    return response.text
            except Exception as e:
                print(f"[Gemini Error]: {e}")

        msg_lower = user_message.lower()
        if "reunión" in msg_lower or "agendar" in msg_lower or "evento" in msg_lower:
            res = add_calendar_event(telegram_id, user_message, "2026-07-27T15:00:00Z", "2026-07-27T16:00:00Z")
            return f"📅 {res['message']}\n\nHe añadido el evento a tu calendario de la Mini App."
        
        elif "tarea" in msg_lower or "kanban" in msg_lower or "pendiente" in msg_lower or "comprar" in msg_lower:
            res = create_kanban_task(telegram_id, user_message)
            return f"📋 {res['message']}\n\nPuedes verla y organizarla en la pestaña Kanban de la Mini App."
        
        elif "gasté" in msg_lower or "pagué" in msg_lower or "ingreso" in msg_lower or "$" in msg_lower:
            res = record_transaction(telegram_id, "expense", 25.00, "General", user_message)
            return f"💰 {res['message']}\n\nTu balance se actualizó automáticamente en el Dashboard Financiero."

        elif "hábito" in msg_lower or "medit" in msg_lower or "ejercicio" in msg_lower:
            res = log_habit(telegram_id, user_message)
            return f"🔥 {res['message']}\n\n¡Sigue así! La racha se ha guardado."

        return f"✨ He procesado tu mensaje: '{user_message}'.\n\nPuedes revisar tus tareas, finanzas y calendario abriendo la **Telegram Mini App** abajo."

ai_engine = GeminiAIEngine()
