import os
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

try:
    from backend.ai.tools import TOOL_DECLARATIONS, TOOL_FUNCTIONS_MAP
    from backend.ai.prompts import get_system_prompt
    from backend.database import db_service
    from backend.config import settings
except ModuleNotFoundError:
    from ai.tools import TOOL_DECLARATIONS, TOOL_FUNCTIONS_MAP
    from ai.prompts import get_system_prompt
    from database import db_service
    from config import settings

logger = logging.getLogger(__name__)


class GeminiAIEngine:
    def __init__(self):
        self.has_genai = False
        self.client = None
        
        api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
        if api_key and api_key != "GEMINI_API_KEY_PLACEHOLDER" and genai:
            try:
                self.client = genai.Client(api_key=api_key)
                self.has_genai = True
                logger.info("Gemini AI client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini client: {e}")
                self.has_genai = False
        else:
            logger.info("Gemini API key not configured or placeholder - using fallback mode")

    async def _get_user_timezone(self, telegram_id: int) -> str:
        """Get user's timezone from database, fallback to Argentina."""
        try:
            if db_service.has_supabase:
                res = db_service.client.table("users").select("timezone").eq("telegram_id", telegram_id).execute()
                if res.data and res.data[0].get("timezone"):
                    return res.data[0]["timezone"]
        except Exception:
            pass
        return "America/Argentina/Buenos_Aires"

    async def _get_conversation_history(self, telegram_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent conversation history from ai_memories or similar."""
        # For now, return empty - we can implement conversation history later
        return []

    async def process_message(self, telegram_id: int, user_message: str) -> str:
        """Process a user message through Gemini with real function calling."""
        
        if not self.has_genai or not self.client:
            return await self._fallback_process(telegram_id, user_message)

        try:
            user_timezone = await self._get_user_timezone(telegram_id)
            system_prompt = get_system_prompt(user_timezone)
            
            # Build the contents with history (if any) + current message
            contents = [
                types.Content(role="user", parts=[types.Part(text=user_message)])
            ]
            
            # Configure tools for function calling
            tools = [types.Tool(function_declarations=TOOL_DECLARATIONS)]
            
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=tools,
                temperature=0.3,
                max_output_tokens=2048,
            )
            
            # First call to Gemini (async)
            response = await self.client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=config,
            )
            
            # Check if Gemini wants to call a function
            function_calls = []
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'function_call') and part.function_call:
                        function_calls.append(part.function_call)
            
            if not function_calls:
                # No function calls, return the text response directly
                return response.text or "No pude generar una respuesta. ¿Podrías reformular?"
            
            # Execute function calls and collect results
            function_responses = []
            for fc in function_calls:
                tool_name = fc.name
                tool_args = dict(fc.args)
                
                # Add telegram_id to tool args
                tool_args["telegram_id"] = telegram_id
                
                logger.info(f"Executing tool: {tool_name} with args: {tool_args}")
                
                try:
                    if tool_name in TOOL_FUNCTIONS_MAP:
                        result = await TOOL_FUNCTIONS_MAP[tool_name](**tool_args)
                        function_responses.append({
                            "name": tool_name,
                            "response": result
                        })
                    else:
                        logger.warning(f"Unknown tool: {tool_name}")
                        function_responses.append({
                            "name": tool_name,
                            "response": {"error": f"Unknown tool: {tool_name}"}
                        })
                except Exception as e:
                    logger.error(f"Tool execution failed: {tool_name} - {e}")
                    function_responses.append({
                        "name": tool_name,
                        "response": {"error": str(e)}
                    })
            
            # Send function results back to Gemini for final response
            if function_responses:
                function_response_parts = []
                for fr in function_responses:
                    function_response_parts.append(
                        types.Part(function_response=types.FunctionResponse(
                            name=fr["name"],
                            response=fr["response"]
                        ))
                    )
                
                # Add the model's function call response and our function results
                contents.append(types.Content(
                    role="model",
                    parts=[types.Part(function_call=fc) for fc in function_calls]
                ))
                contents.append(types.Content(
                    role="user",  # function_response goes as user role
                    parts=function_response_parts
                ))
                
                # Second call to get natural language response (async)
                final_response = await self.client.aio.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents,
                    config=config,
                )
                
                return final_response.text or "Listo, completé la acción. ¿Necesitas algo más?"
            
            return "Procesé tu solicitud pero no pude generar respuesta. ¿Algo más?"

        except Exception as e:
            logger.error(f"[Gemini Error] {e}", exc_info=True)
            # Fallback to rule-based processing
            return await self._fallback_process(telegram_id, user_message)

    async def _fallback_process(self, telegram_id: int, user_message: str) -> str:
        """Fallback rule-based processing when Gemini is not available or quota limit hit."""
        msg = user_message.lower()
        
        try:
            # 1. Notes / Wiki / Anotar
            if any(kw in msg for kw in ["anotá", "anota", "anótame", "anotame", "guarda", "guardá", "nota", "medida", "medidas", "recordá", "recuerda", "memoria", "bloc"]):
                return await self._fallback_wiki(telegram_id, user_message)

            # 2. Calendar events / Recordatorios con hora / Pastillas
            elif any(kw in msg for kw in ["reunión", "reunion", "agendar", "agendame", "agendá", "evento", "cita", "recordatorio", "programar", "pastilla", "medicamento", "a las", "hora"]):
                return await self._fallback_calendar(telegram_id, user_message)
            
            # 3. Finance / Gastos
            elif any(kw in msg for kw in ["gasté", "gaste", "pagué", "pague", "ingreso", "cobré", "cobre", "compré", "compre", "pagó", "pago", "$", "pesos", "dólares", "dolares"]):
                return await self._fallback_finance(telegram_id, user_message)

            # 4. Kanban tasks
            elif any(kw in msg for kw in ["tarea", "kanban", "pendiente", "comprar", "hacer", "añadir"]):
                return await self._fallback_kanban(telegram_id, user_message)
            
            # 5. Habits
            elif any(kw in msg for kw in ["hábito", "habito", "medit", "ejercicio", "completé", "cumplí", "cumpli"]):
                return await self._fallback_habit(telegram_id, user_message)

            # 6. Password Vault
            elif any(kw in msg for kw in ["clave", "contraseña", "password", "pin", "bóveda", "boveda", "vault"]):
                return await self._fallback_password(telegram_id, user_message)

            # If user mentions any action verb or time, force calendar/note fallback instead of generic message
            elif any(char.isdigit() for char in msg) or len(msg.split()) > 3:
                return await self._fallback_calendar(telegram_id, user_message)
            
            return ("Entendido. Soy tu asistente de productividad en Telegram. "
                   "Puedo ayudarte a agendar eventos, crear tareas, registrar gastos, "
                   "marcar hábitos y guardar notas. ¿En qué te ayudo hoy? 😊")
                   
        except Exception as e:
            logger.error(f"Fallback processing error: {e}")
            return "Hubo un problema procesando tu mensaje. Intenta de nuevo o sé más específico."

    async def _fallback_calendar(self, telegram_id: int, user_message: str) -> str:
        """Basic calendar fallback - parse time and title intelligently from user message."""
        import re
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo
        
        user_tz_str = await self._get_user_timezone(telegram_id)
        try:
            tz = ZoneInfo(user_tz_str)
        except Exception:
            tz = ZoneInfo("America/Argentina/Buenos_Aires")
            
        now = datetime.now(tz)
        msg_lower = user_message.lower()
        
        start = None
        time_str_to_remove = ""
        
        # 1. Relative time: "en 10 minutos", "en 5 min"
        match_rel = re.search(r'\ben\s+(\d+)\s+min(?:uto)?s?\b', msg_lower)
        if match_rel:
            mins = int(match_rel.group(1))
            start = now + timedelta(minutes=mins)
            time_str_to_remove = match_rel.group(0)
        else:
            # 2. Specific time with minutes: e.g. "20:19", "20.19", "8:19 pm", "a las 20:19"
            match_hhmm = re.search(r'(?:a las\s+)?(\d{1,2})[:.](\d{2})\s*(am|pm|hs|hrs|horas)?\b', msg_lower)
            # 3. Specific time without minutes: e.g. "a las 20", "a las 8 pm", "20 hs"
            match_alas = re.search(r'(?:\ba las\s+(\d{1,2})\s*(am|pm|hs|hrs|horas)?\b|\b(\d{1,2})\s*(am|pm|hs|hrs|horas)\b)', msg_lower)
            
            match = match_hhmm or match_alas
            if match:
                time_str_to_remove = match.group(0)
                if match_hhmm:
                    h = int(match.group(1))
                    m = int(match.group(2))
                    ampm = match.group(3)
                else:
                    h = int(match.group(1) or match.group(3))
                    m = 0
                    ampm = match.group(2) or match.group(4)
                
                if ampm:
                    ampm_lower = ampm.lower()
                    if ampm_lower == "pm" and h < 12:
                        h += 12
                    elif ampm_lower == "am" and h == 12:
                        h = 0
                
                if 0 <= h <= 23 and 0 <= m <= 59:
                    start_today = now.replace(hour=h, minute=m, second=0, microsecond=0)
                    if start_today > now:
                        start = start_today
                    else:
                        start = start_today + timedelta(days=1)
        
        if not start:
            start = (now + timedelta(hours=1)).replace(second=0, microsecond=0)
        
        end = start + timedelta(hours=1)
        
        # Extract title from user_message
        clean_title = user_message
        if time_str_to_remove:
            pattern = re.escape(time_str_to_remove)
            clean_title = re.sub(pattern, "", clean_title, flags=re.IGNORECASE)
            
        clean_title = re.sub(r'\b(hoy|mañana|manana)\b', '', clean_title, flags=re.IGNORECASE)
        clean_title = re.sub(r'^(?:agendar|programar|crear|añadir|agregar|poner)\s+(?:un|una|el|la|este|esta)?\s*', '', clean_title, flags=re.IGNORECASE)
        clean_title = clean_title.strip(" .,!?\t\n")
        
        if len(clean_title) < 2:
            if any(k in msg_lower for k in ["pastilla", "medicamento"]):
                clean_title = "Recordatorio de pastilla"
            else:
                clean_title = "Evento desde chat"
        else:
            clean_title = clean_title[0].upper() + clean_title[1:]

        if any(k in msg_lower for k in ["pastilla", "medicamento", "hora exacta"]):
            category = "medicamento"
            reminder_minutes_before = 0
        else:
            category = "general"
            reminder_minutes_before = 15
        
        event = {
            "telegram_id": telegram_id,
            "title": clean_title,
            "description": user_message,
            "start_time": start.astimezone(ZoneInfo("UTC")).isoformat(),
            "end_time": end.astimezone(ZoneInfo("UTC")).isoformat(),
            "category": category,
            "is_all_day": False,
            "reminder_minutes_before": reminder_minutes_before,
            "reminder_sent": False
        }
        result = await db_service.add_event(event)
        return f"📅 Evento creado: **{result.get('title', clean_title)}** para el {start.strftime('%d/%m a las %H:%M')}."

    async def _fallback_kanban(self, telegram_id: int, user_message: str) -> str:
        """Basic Kanban fallback."""
        task = {
            "telegram_id": telegram_id,
            "title": "Tarea desde chat",
            "description": user_message,
            "status": "todo",
            "priority": "medium"
        }
        result = await db_service.add_task(task)
        return f"✅ Tarea agregada al Kanban: **{result.get('title', 'Tarea')}**."

    async def _fallback_finance(self, telegram_id: int, user_message: str) -> str:
        """Basic finance fallback."""
        import re
        amounts = re.findall(r'[\d,]+\.?\d*', user_message.replace(',', ''))
        amount = float(amounts[0]) if amounts else 25.0
        
        record = {
            "telegram_id": telegram_id,
            "type": "expense",
            "amount": amount,
            "category": "General",
            "description": user_message,
            "record_date": datetime.now().date().isoformat()
        }
        result = await db_service.add_finance(record)
        return f"💰 Gasto registrado: **${amount}** en *{record['category']}*."

    async def _fallback_habit(self, telegram_id: int, user_message: str) -> str:
        """Basic habit fallback."""
        habits = await db_service.get_user_habits(telegram_id)
        if habits:
            habit = habits[0]
            result = await db_service.log_habit_completion(habit["id"], telegram_id, datetime.now().date().isoformat())
            return f"🔥 Hábito **{habit['title']}** completado. Racha: {result.get('streak_count', 1)} días."
        return "No tienes hábitos configurados aún. Crea uno desde la app."

    async def _fallback_wiki(self, telegram_id: int, user_message: str) -> str:
        """Fallback for wiki / notes."""
        clean = user_message
        import re
        clean = re.sub(r'^(?:anota|anotá|anótame|anotame|guarda|guardá|recuerda|recordá)\s*(?:que|esto|las|los|mi)?\s*', '', clean, flags=re.IGNORECASE).strip()
        title = clean[:30] + ("..." if len(clean) > 30 else "") if clean else "Nota guardada"
        note = {
            "telegram_id": telegram_id,
            "title": title.capitalize(),
            "content": user_message,
            "category": "General",
            "tags": ["chat"]
        }
        res = await db_service.add_wiki(note)
        return f"📝 Nota guardada en tu Wiki: **{res.get('title', title)}**."

    async def _fallback_password(self, telegram_id: int, user_message: str) -> str:
        """Fallback for password vault."""
        words = user_message.split()
        service = words[0] if words else "Servicio"
        pwd = {
            "telegram_id": telegram_id,
            "service_name": service.capitalize(),
            "password_value": user_message,
            "username": "usuario",
            "category": "Personal"
        }
        res = await db_service.add_password(pwd)
        return f"🔑 Clave para **{res.get('service_name', service)}** guardada de forma segura en la Bóveda."

# Global instance
ai_engine = GeminiAIEngine()