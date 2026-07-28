import os
from typing import Dict, Any, List, Optional

try:
    from backend.config import settings
except ModuleNotFoundError:
    from config import settings

IN_MEMORY_DB: Dict[str, List[Dict[str, Any]]] = {
    "users": [],
    "ai_memories": [],
    "calendar_events": [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "telegram_id": 5634360549,
            "title": "Reunión de Planificación SaaS",
            "description": "Revisar arquitectura con el equipo",
            "start_time": "2026-07-27T10:00:00Z",
            "end_time": "2026-07-27T11:00:00Z",
            "category": "trabajo",
            "is_all_day": False
        }
    ],
    "kanban_tasks": [
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "telegram_id": 5634360549,
            "title": "Diseñar Landing Page Mini App",
            "description": "Usar componentes de Tailwind y CSS variables de Telegram",
            "status": "todo",
            "priority": "high",
            "due_date": "2026-07-28T18:00:00Z"
        }
    ],
    "financial_records": [
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "telegram_id": 5634360549,
            "type": "expense",
            "amount": 45.50,
            "category": "Alimentación",
            "description": "Almuerzo de trabajo",
            "record_date": "2026-07-27"
        }
    ],
    "habits": [
        {
            "id": "66666666-6666-6666-6666-666666666666",
            "telegram_id": 5634360549,
            "title": "Meditar 10 minutos",
            "target_frequency": "daily",
            "streak_count": 5
        }
    ],
    "habit_logs": [],
    "wiki_notes": [
        {
            "id": "88888888-8888-8888-8888-888888888888",
            "telegram_id": 5634360549,
            "title": "💡 Ideas para la Mini App Notion",
            "content_json": {"type": "doc", "content": [{"type": "paragraph", "text": "Sistema completo de productividad personal integrado en Telegram."}]},
            "tags": ["ideas", "saas", "notion"],
            "updated_at": "2026-07-27T04:00:00Z"
        }
    ]
}

class SupabaseService:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.has_supabase = False
        try:
            from supabase import create_client
            if "your-project" not in self.url and self.key:
                self.client = create_client(self.url, self.key)
                self.has_supabase = True
        except Exception:
            self.has_supabase = False

    async def get_user_events(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            res = self.client.table("calendar_events").select("*").eq("telegram_id", telegram_id).execute()
            return res.data
        return [e for e in IN_MEMORY_DB["calendar_events"] if e.get("telegram_id") == telegram_id]

    async def add_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            res = self.client.table("calendar_events").insert(event_data).execute()
            return res.data[0] if res.data else event_data
        import uuid
        event_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["calendar_events"].append(event_data)
        return event_data

    async def get_user_tasks(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            res = self.client.table("kanban_tasks").select("*").eq("telegram_id", telegram_id).execute()
            return res.data
        return [t for t in IN_MEMORY_DB["kanban_tasks"] if t.get("telegram_id") == telegram_id]

    async def add_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            res = self.client.table("kanban_tasks").insert(task_data).execute()
            return res.data[0] if res.data else task_data
        import uuid
        task_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["kanban_tasks"].append(task_data)
        return task_data

    async def get_user_finances(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            res = self.client.table("financial_records").select("*").eq("telegram_id", telegram_id).execute()
            return res.data
        return [f for f in IN_MEMORY_DB["financial_records"] if f.get("telegram_id") == telegram_id]

    async def add_finance(self, finance_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            res = self.client.table("financial_records").insert(finance_data).execute()
            return res.data[0] if res.data else finance_data
        import uuid
        finance_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["financial_records"].append(finance_data)
        return finance_data

    async def get_user_habits(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            res = self.client.table("habits").select("*").eq("telegram_id", telegram_id).execute()
            return res.data
        return [h for h in IN_MEMORY_DB["habits"] if h.get("telegram_id") == telegram_id]

    async def add_habit(self, habit_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            res = self.client.table("habits").insert(habit_data).execute()
            return res.data[0] if res.data else habit_data
        import uuid
        habit_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["habits"].append(habit_data)
        return habit_data

    async def get_user_wiki(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            res = self.client.table("wiki_notes").select("*").eq("telegram_id", telegram_id).execute()
            return res.data
        return [w for w in IN_MEMORY_DB["wiki_notes"] if w.get("telegram_id") == telegram_id]

    async def add_wiki(self, note_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            res = self.client.table("wiki_notes").insert(note_data).execute()
            return res.data[0] if res.data else note_data
        import uuid
        note_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["wiki_notes"].append(note_data)
        return note_data

db_service = SupabaseService()
