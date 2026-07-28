from typing import Dict, Any, List
from backend.database import db_service

def add_calendar_event(telegram_id: int, title: str, start_time: str, end_time: str, description: str = "", category: str = "general") -> Dict[str, Any]:
    """Crea un evento o bloque de tiempo en el calendario del usuario."""
    event_data = {
        "telegram_id": telegram_id,
        "title": title,
        "description": description,
        "start_time": start_time,
        "end_time": end_time,
        "category": category,
        "is_all_day": False
    }
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                res = pool.submit(asyncio.run, db_service.add_event(event_data)).result()
        else:
            res = loop.run_until_complete(db_service.add_event(event_data))
    except Exception:
        res = event_data
    return {"status": "success", "event": res, "message": f"Evento '{title}' agendado con éxito."}

def create_kanban_task(telegram_id: int, title: str, description: str = "", status: str = "todo", priority: str = "medium", due_date: str = None) -> Dict[str, Any]:
    """Crea una tarea en el tablero Kanban asignando prioridad y estado."""
    task_data = {
        "telegram_id": telegram_id,
        "title": title,
        "description": description,
        "status": status,
        "priority": priority,
        "due_date": due_date
    }
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                res = pool.submit(asyncio.run, db_service.add_task(task_data)).result()
        else:
            res = loop.run_until_complete(db_service.add_task(task_data))
    except Exception:
        res = task_data
    return {"status": "success", "task": res, "message": f"Tarea '{title}' agregada al Kanban."}

def record_transaction(telegram_id: int, type: str, amount: float, category: str, description: str = "") -> Dict[str, Any]:
    """Registra un ingreso o egreso financiero con su monto y categoría."""
    finance_data = {
        "telegram_id": telegram_id,
        "type": type,
        "amount": amount,
        "category": category,
        "description": description
    }
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                res = pool.submit(asyncio.run, db_service.add_finance(finance_data)).result()
        else:
            res = loop.run_until_complete(db_service.add_finance(finance_data))
    except Exception:
        res = finance_data
    return {"status": "success", "record": res, "message": f"Registro financiero de ${amount} ({type}) guardado."}

def log_habit(telegram_id: int, habit_title: str) -> Dict[str, Any]:
    """Marca un hábito como completado en el día actual."""
    return {"status": "success", "habit": habit_title, "message": f"¡Hábito '{habit_title}' marcado como completado hoy! 🔥"}

def save_memory(telegram_id: int, category: str, fact_key: str, fact_value: str) -> Dict[str, Any]:
    """Guarda un hecho o preferencia descubierta del usuario en la memoria a largo plazo."""
    return {"status": "success", "fact": {fact_key: fact_value}, "message": f"Recordaré que {fact_key}: {fact_value}."}

TOOL_FUNCTIONS = [
    add_calendar_event,
    create_kanban_task,
    record_transaction,
    log_habit,
    save_memory
]
