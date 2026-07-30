from typing import Dict, Any, List
from datetime import datetime
from zoneinfo import ZoneInfo
import requests

try:
    from backend.database import db_service
    from backend.config import settings
except ModuleNotFoundError:
    from database import db_service
    from config import settings


async def add_calendar_event(
    telegram_id: int,
    title: str,
    start_time: str,
    end_time: str,
    description: str = "",
    category: str = "general"
) -> Dict[str, Any]:
    """Create a calendar event with the given details."""
    event_data = {
        "telegram_id": telegram_id,
        "title": title,
        "description": description,
        "start_time": start_time,
        "end_time": end_time,
        "category": category,
        "is_all_day": False
    }
    result = await db_service.add_event(event_data)
    return {"status": "success", "event": result, "message": f"📅 Evento '{title}' agendado con éxito para {start_time}."}


async def create_kanban_task(
    telegram_id: int,
    title: str,
    description: str = "",
    status: str = "todo",
    priority: str = "medium",
    due_date: str = None
) -> Dict[str, Any]:
    """Create a Kanban task."""
    task_data = {
        "telegram_id": telegram_id,
        "title": title,
        "description": description,
        "status": status,
        "priority": priority,
        "due_date": due_date
    }
    result = await db_service.add_task(task_data)
    return {"status": "success", "task": result, "message": f"📋 Tarea '{title}' agregada al Kanban."}


async def record_transaction(
    telegram_id: int,
    type: str,
    amount: float,
    category: str,
    description: str = ""
) -> Dict[str, Any]:
    """Record a financial transaction (income or expense)."""
    finance_data = {
        "telegram_id": telegram_id,
        "type": type,
        "amount": amount,
        "category": category,
        "description": description,
        "record_date": datetime.now().date().isoformat()
    }
    result = await db_service.add_finance(finance_data)
    return {"status": "success", "record": result, "message": f"💰 Registro financiero de ${amount} ({type}) guardado."}


async def log_habit(
    telegram_id: int,
    habit_title: str,
    completed_date: str = None
) -> Dict[str, Any]:
    """Log a habit completion and recalculate streak."""
    if not completed_date:
        completed_date = datetime.now().date().isoformat()
    
    habits = await db_service.get_user_habits(telegram_id)
    habit = next((h for h in habits if h.get("title", "").lower() == habit_title.lower()), None)
    
    if not habit:
        new_h = await db_service.add_habit({"telegram_id": telegram_id, "title": habit_title, "target_frequency": "daily", "streak_count": 1})
        return {"status": "success", "habit": new_h, "message": f"🔥 Nuevo hábito '{habit_title}' creado y completado hoy!"}
    
    result = await db_service.log_habit_completion(habit["id"], telegram_id, completed_date)
    return {"status": "success", "habit": result.get("habit"), "message": f"🔥 ¡Hábito '{habit_title}' marcado como completado hoy!"}


async def save_password_vault(
    telegram_id: int,
    service_name: str,
    password_value: str,
    username: str = "",
    category: str = "Personal",
    notes: str = ""
) -> Dict[str, Any]:
    """Save a password entry in the secure vault."""
    pwd_data = {
        "telegram_id": telegram_id,
        "service_name": service_name,
        "username": username,
        "password_value": password_value,
        "category": category,
        "notes": notes
    }
    result = await db_service.add_password(pwd_data)
    return {"status": "success", "password": result, "message": f"🔑 Contraseña para '{service_name}' guardada de forma segura en tu Bóveda."}


async def get_weather_forecast(
    telegram_id: int = None,
    city: str = "Buenos Aires",
    latitude: float = -34.6037,
    longitude: float = -58.3816
) -> Dict[str, Any]:
    """Get current weather forecast using Open-Meteo API."""
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
        r = requests.get(url, timeout=5.0).json()
        curr = r.get("current", {})
        temp = curr.get("temperature_2m", 20)
        humidity = curr.get("relative_humidity_2m", 50)
        wind = curr.get("wind_speed_10m", 10)
        return {
            "status": "success",
            "city": city,
            "temperature_c": temp,
            "humidity_percent": humidity,
            "wind_speed_kmh": wind,
            "message": f"🌤️ Clima en {city}: {temp}°C, Humedad {humidity}%, Viento {wind} km/h."
        }
    except Exception as e:
        return {"status": "error", "message": f"No se pudo consultar el clima: {e}"}


# Tool function declarations for Gemini (JSON schema format)
TOOL_DECLARATIONS = [
    {
        "name": "add_calendar_event",
        "description": "Crea un evento en el calendario del usuario. Usa esto cuando el usuario pida agendar, programar o crear una reunión, cita, evento, recordatorio, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Título del evento (ej: 'Reunión con Juan', 'Cita médico')"},
                "description": {"type": "string", "description": "Descripción adicional opcional"},
                "start_time": {"type": "string", "description": "Fecha y hora de inicio en ISO 8601 UTC (ej: '2026-07-28T15:00:00Z')"},
                "end_time": {"type": "string", "description": "Fecha y hora de fin en ISO 8601 UTC (ej: '2026-07-28T16:00:00Z')"},
                "category": {"type": "string", "description": "Categoría: trabajo, personal, medicamento, cita, evento, general", "enum": ["trabajo", "personal", "medicamento", "cita", "evento", "general"]}
            },
            "required": ["title", "start_time", "end_time"]
        }
    },
    {
        "name": "create_kanban_task",
        "description": "Crea una tarea en el tablero Kanban. Usa esto cuando el usuario pida añadir una tarea, pendiente, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Título de la tarea"},
                "description": {"type": "string", "description": "Descripción opcional"},
                "status": {"type": "string", "description": "Estado inicial: todo, in_progress, done", "enum": ["todo", "in_progress", "done"], "default": "todo"},
                "priority": {"type": "string", "description": "Prioridad: low, medium, high", "enum": ["low", "medium", "high"], "default": "medium"},
                "due_date": {"type": "string", "description": "Fecha límite opcional en ISO 8601"}
            },
            "required": ["title"]
        }
    },
    {
        "name": "record_transaction",
        "description": "Registra un gasto o ingreso en las finanzas. Usa esto cuando el usuario diga que gastó, pagó, compró, recibió dinero, ingreso, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "description": "Tipo: expense o income", "enum": ["expense", "income"]},
                "amount": {"type": "number", "description": "Monto numérico (ej: 4500, 15.50)"},
                "category": {"type": "string", "description": "Categoría (ej: Transporte, Alimentación, Ocio, Salario, Freelance)"},
                "description": {"type": "string", "description": "Descripción opcional"}
            },
            "required": ["type", "amount", "category"]
        }
    },
    {
        "name": "log_habit",
        "description": "Marca un hábito como completado hoy y actualiza la racha. Usa esto cuando el usuario diga que completó un hábito.",
        "parameters": {
            "type": "object",
            "properties": {
                "habit_title": {"type": "string", "description": "Título del hábito (ej: 'Meditar 10 minutos')"},
                "completed_date": {"type": "string", "description": "Fecha en ISO 8601"}
            },
            "required": ["habit_title"]
        }
    },
    {
        "name": "save_password_vault",
        "description": "Guarda una contraseña o clave de acceso en la Bóveda Segura del usuario.",
        "parameters": {
            "type": "object",
            "properties": {
                "service_name": {"type": "string", "description": "Nombre de la aplicación o servicio (ej: 'Netflix', 'Wi-Fi Casa', 'Gmail')"},
                "password_value": {"type": "string", "description": "La contraseña o clave a guardar"},
                "username": {"type": "string", "description": "Usuario o email opcional"},
                "category": {"type": "string", "description": "Categoría: Personal, Trabajo, Streaming, Finanzas, Redes"},
                "notes": {"type": "string", "description": "Notas o PIN opcional"}
            },
            "required": ["service_name", "password_value"]
        }
    },
    {
        "name": "get_weather_forecast",
        "description": "Consulta el clima actual y pronóstico. Usa esto cuando el usuario pregunte por el clima, temperatura o pronóstico.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "Nombre de la ciudad (ej: 'Buenos Aires', 'Madrid')"}
            }
        }
    }
]


# Map tool names to actual async functions
TOOL_FUNCTIONS_MAP = {
    "add_calendar_event": add_calendar_event,
    "create_kanban_task": create_kanban_task,
    "record_transaction": record_transaction,
    "log_habit": log_habit,
    "save_password_vault": save_password_vault,
    "get_weather_forecast": get_weather_forecast,
}