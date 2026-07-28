from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

try:
    from backend.config import settings
except ModuleNotFoundError:
    from config import settings

_DEV_ID = settings.DEV_TELEGRAM_ID or 5634360549

IN_MEMORY_DB: Dict[str, List[Dict[str, Any]]] = {
    "users": [
        {
            "telegram_id": _DEV_ID,
            "username": "rodrigo",
            "first_name": "Rodrigo",
            "latitude": -34.6037,
            "longitude": -58.3816,
            "city": "Buenos Aires"
        }
    ],
    "ai_memories": [],
    "calendar_events": [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "telegram_id": _DEV_ID,
            "title": "Reunión de Planificación SaaS",
            "description": "Revisar arquitectura con el equipo",
            "start_time": "2026-07-28T10:00:00Z",
            "end_time": "2026-07-28T11:00:00Z",
            "category": "trabajo",
            "is_all_day": False,
            "reminder_minutes_before": 15,
            "reminder_sent": False
        }
    ],
    "kanban_tasks": [
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "telegram_id": _DEV_ID,
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
            "telegram_id": _DEV_ID,
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
            "telegram_id": _DEV_ID,
            "title": "Meditar 10 minutos",
            "target_frequency": "daily",
            "streak_count": 5
        }
    ],
    "habit_logs": [],
    "wiki_notes": [
        {
            "id": "88888888-8888-8888-8888-888888888888",
            "telegram_id": _DEV_ID,
            "title": "💡 Ideas para la Mini App Notion",
            "content_json": {"type": "doc", "content": [{"type": "paragraph", "text": "Sistema completo de productividad personal integrado en Telegram."}]},
            "tags": ["ideas", "saas", "notion"],
            "updated_at": "2026-07-27T04:00:00Z"
        }
    ],
    "local_reviews": [
        {
            "id": "99999999-9999-9999-9999-999999999999",
            "telegram_id": _DEV_ID,
            "place_name": "Café Central Notion",
            "latitude": -34.6037,
            "longitude": -58.3816,
            "rating": 5,
            "comment": "Excelente café con WiFi rápido para trabajar en la Mini App",
            "created_at": "2026-07-28T01:00:00Z"
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

    # ===== CALENDAR EVENTS & REMINDERS =====
    async def get_user_events(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("calendar_events").select("*").eq("telegram_id", telegram_id).execute()
                return res.data
            except Exception:
                pass
        return [e for e in IN_MEMORY_DB["calendar_events"] if e.get("telegram_id") == telegram_id]

    async def add_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("calendar_events").insert(event_data).execute()
                return res.data[0] if res.data else event_data
            except Exception:
                pass
        import uuid
        event_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["calendar_events"].append(event_data)
        return event_data

    async def update_event(self, event_id: str, telegram_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("calendar_events").update(update_data).eq("id", event_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass
        for e in IN_MEMORY_DB["calendar_events"]:
            if e["id"] == event_id and e.get("telegram_id") == telegram_id:
                e.update(update_data)
                return e
        raise ValueError("Event not found or access denied")

    async def delete_event(self, event_id: str, telegram_id: int) -> None:
        if self.has_supabase:
            try:
                res = self.client.table("calendar_events").delete().eq("id", event_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return
            except Exception:
                pass
        for i, e in enumerate(IN_MEMORY_DB["calendar_events"]):
            if e["id"] == event_id and e.get("telegram_id") == telegram_id:
                IN_MEMORY_DB["calendar_events"].pop(i)
                return
        raise ValueError("Event not found or access denied")

    async def get_pending_reminders((self) -> List[Dict[str, Any]]:
        """Fetch events that require a reminder notification."""
        now = datetime.now(timezone.utc)
        pending = []
        if self.has_supabase:
            try:
                res = self.client.table("calendar_events").select("*").not_.is_("reminder_minutes_before", "null").eq("reminder_sent", False).execute()
                for e in (res.data or []):
                    try:
                        start = datetime.fromisoformat(e["start_time"].replace("Z", "+00:00"))
                        diff_minutes = (start - now).total_seconds() / 60
                        if 0 <= diff_minutes <= (e.get("reminder_minutes_before") or 15):
                            pending.append(e)
                    except Exception:
                        pass
                return pending
            except Exception:
                pass
        for e in IN_MEMORY_DB["calendar_events"]:
            if e.get("reminder_minutes_before") is not None and not e.get("reminder_sent", False):
                try:
                    start = datetime.fromisoformat(e["start_time"].replace("Z", "+00:00"))
                    diff_minutes = (start - now).total_seconds() / 60
                    if 0 <= diff_minutes <= (e.get("reminder_minutes_before") or 15):
                        pending.append(e)
                except Exception:
                    pass
        return pending

    async def mark_reminder_sent(self, event_id: str) -> None:
        if self.has_supabase:
            try:
                self.client.table("calendar_events").update({"reminder_sent": True}).eq("id", event_id).execute()
                return
            except Exception:
                pass
        for e in IN_MEMORY_DB["calendar_events"]:
            if e["id"] == event_id:
                e["reminder_sent"] = True
                return

    # ===== LOCAL REVIEWS =====
    async def get_local_reviews(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("local_reviews").select("*").eq("telegram_id", telegram_id).order("created_at", desc=True).execute()
                return res.data or []
            except Exception:
                pass
        return [r for r in IN_MEMORY_DB["local_reviews"] if r.get("telegram_id") == telegram_id]

    async def add_local_review(self, review_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("local_reviews").insert(review_data).execute()
                return res.data[0] if res.data else review_data
            except Exception:
                pass
        import uuid
        review_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["local_reviews"].append(review_data)
        return review_data

    # ===== KANBAN TASKS =====
    async def get_user_tasks(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("kanban_tasks").select("*").eq("telegram_id", telegram_id).execute()
                return res.data
            except Exception:
                pass
        return [t for t in IN_MEMORY_DB["kanban_tasks"] if t.get("telegram_id") == telegram_id]

    async def add_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("kanban_tasks").insert(task_data).execute()
                return res.data[0] if res.data else task_data
            except Exception:
                pass
        import uuid
        task_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["kanban_tasks"].append(task_data)
        return task_data

    async def update_task(self, task_id: str, telegram_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("kanban_tasks").update(update_data).eq("id", task_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass
        for t in IN_MEMORY_DB["kanban_tasks"]:
            if t["id"] == task_id and t.get("telegram_id") == telegram_id:
                t.update(update_data)
                return t
        raise ValueError("Task not found or access denied")

    async def delete_task(self, task_id: str, telegram_id: int) -> None:
        if self.has_supabase:
            try:
                res = self.client.table("kanban_tasks").delete().eq("id", task_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return
            except Exception:
                pass
        for i, t in enumerate(IN_MEMORY_DB["kanban_tasks"]):
            if t["id"] == task_id and t.get("telegram_id") == telegram_id:
                IN_MEMORY_DB["kanban_tasks"].pop(i)
                return
        raise ValueError("Task not found or access denied")

    # ===== FINANCE RECORDS =====
    async def get_user_finances(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("financial_records").select("*").eq("telegram_id", telegram_id).execute()
                return res.data
            except Exception:
                pass
        return [f for f in IN_MEMORY_DB["financial_records"] if f.get("telegram_id") == telegram_id]

    async def add_finance(self, finance_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("financial_records").insert(finance_data).execute()
                return res.data[0] if res.data else finance_data
            except Exception:
                pass
        import uuid
        finance_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["financial_records"].append(finance_data)
        return finance_data

    async def delete_finance(self, record_id: str, telegram_id: int) -> None:
        if self.has_supabase:
            try:
                res = self.client.table("financial_records").delete().eq("id", record_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return
            except Exception:
                pass
        for i, f in enumerate(IN_MEMORY_DB["financial_records"]):
            if f["id"] == record_id and f.get("telegram_id") == telegram_id:
                IN_MEMORY_DB["financial_records"].pop(i)
                return
        raise ValueError("Record not found or access denied")

    async def update_finance(self, record_id: str, telegram_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("financial_records").update(update_data).eq("id", record_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass
        for f in IN_MEMORY_DB["financial_records"]:
            if f["id"] == record_id and f.get("telegram_id") == telegram_id:
                f.update(update_data)
                return f
        raise ValueError("Record not found or access denied")

    # ===== HABITS =====
    async def get_user_habits(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("habits").select("*").eq("telegram_id", telegram_id).execute()
                return res.data
            except Exception:
                pass
        return [h for h in IN_MEMORY_DB["habits"] if h.get("telegram_id") == telegram_id]

    async def add_habit(self, habit_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("habits").insert(habit_data).execute()
                return res.data[0] if res.data else habit_data
            except Exception:
                pass
        import uuid
        habit_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["habits"].append(habit_data)
        return habit_data

    async def delete_habit(self, habit_id: str, telegram_id: int) -> None:
        if self.has_supabase:
            try:
                res = self.client.table("habits").delete().eq("id", habit_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return
            except Exception:
                pass
        for i, h in enumerate(IN_MEMORY_DB["habits"]):
            if h["id"] == habit_id and h.get("telegram_id") == telegram_id:
                IN_MEMORY_DB["habits"].pop(i)
                return
        raise ValueError("Habit not found or access denied")

    async def update_habit(self, habit_id: str, telegram_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("habits").update(update_data).eq("id", habit_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass
        for h in IN_MEMORY_DB["habits"]:
            if h["id"] == habit_id and h.get("telegram_id") == telegram_id:
                h.update(update_data)
                return h
        raise ValueError("Habit not found or access denied")

    async def log_habit_completion(self, habit_id: str, telegram_id: int, completed_date) -> Dict[str, Any]:
        from datetime import date
        if isinstance(completed_date, str):
            completed_date = date.fromisoformat(completed_date)
        
        if self.has_supabase:
            try:
                habit_res = self.client.table("habits").select("*").eq("id", habit_id).eq("telegram_id", telegram_id).execute()
                if habit_res.data:
                    habit = habit_res.data[0]
                    self.client.table("habit_logs").insert({
                        "habit_id": habit_id,
                        "completed_date": completed_date.isoformat()
                    }).execute()
                    new_streak = await self._calculate_streak(habit_id)
                    self.client.table("habits").update({"streak_count": new_streak}).eq("id", habit_id).execute()
                    return {"status": "success", "streak_count": new_streak, "habit": {**habit, "streak_count": new_streak}}
            except Exception as e:
                if "duplicate key" in str(e).lower() or "unique" in str(e).lower():
                    raise ValueError("Already logged for this date")
        
        habit = None
        for h in IN_MEMORY_DB["habits"]:
            if h["id"] == habit_id and h.get("telegram_id") == telegram_id:
                habit = h
                break
        if not habit:
            raise ValueError("Habit not found or access denied")
        
        for log in IN_MEMORY_DB["habit_logs"]:
            if log["habit_id"] == habit_id and log["completed_date"] == completed_date.isoformat():
                raise ValueError("Already logged for this date")
        
        import uuid
        IN_MEMORY_DB["habit_logs"].append({
            "id": str(uuid.uuid4()),
            "habit_id": habit_id,
            "completed_date": completed_date.isoformat()
        })
        
        new_streak = self._calculate_streak_memory(habit_id)
        habit["streak_count"] = new_streak
        return {"status": "success", "streak_count": new_streak, "habit": habit}

    async def _calculate_streak(self, habit_id: str) -> int:
        from datetime import date, timedelta
        logs_res = self.client.table("habit_logs").select("completed_date").eq("habit_id", habit_id).order("completed_date", desc=True).execute()
        if not logs_res.data:
            return 0
        today = date.today()
        streak = 0
        expected_date = today
        for log in logs_res.data:
            log_date = date.fromisoformat(log["completed_date"])
            if log_date == expected_date:
                streak += 1
                expected_date -= timedelta(days=1)
            elif log_date < expected_date:
                break
        return streak

    def _calculate_streak_memory(self, habit_id: str) -> int:
        from datetime import date, timedelta
        logs = sorted(
            [l for l in IN_MEMORY_DB["habit_logs"] if l["habit_id"] == habit_id],
            key=lambda x: x["completed_date"],
            reverse=True
        )
        if not logs:
            return 0
        today = date.today()
        streak = 0
        expected_date = today
        for log in logs:
            log_date = date.fromisoformat(log["completed_date"])
            if log_date == expected_date:
                streak += 1
                expected_date -= timedelta(days=1)
            elif log_date < expected_date:
                break
        return streak

    # ===== WIKI NOTES =====
    async def get_user_wiki(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("wiki_notes").select("*").eq("telegram_id", telegram_id).execute()
                return res.data
            except Exception:
                pass
        return [w for w in IN_MEMORY_DB["wiki_notes"] if w.get("telegram_id") == telegram_id]

    async def add_wiki(self, note_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("wiki_notes").insert(note_data).execute()
                return res.data[0] if res.data else note_data
            except Exception:
                pass
        import uuid
        note_data["id"] = str(uuid.uuid4())
        IN_MEMORY_DB["wiki_notes"].append(note_data)
        return note_data

    async def update_wiki(self, note_id: str, telegram_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("wiki_notes").update(update_data).eq("id", note_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass
        for w in IN_MEMORY_DB["wiki_notes"]:
            if w["id"] == note_id and w.get("telegram_id") == telegram_id:
                w.update(update_data)
                return w
        raise ValueError("Note not found or access denied")

    async def delete_wiki(self, note_id: str, telegram_id: int) -> None:
        if self.has_supabase:
            try:
                res = self.client.table("wiki_notes").delete().eq("id", note_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return
            except Exception:
                pass
        for i, w in enumerate(IN_MEMORY_DB["wiki_notes"]):
            if w["id"] == note_id and w.get("telegram_id") == telegram_id:
                IN_MEMORY_DB["wiki_notes"].pop(i)
                return
        raise ValueError("Note not found or access denied")

    # ===== USERS & LOCATION =====
    async def upsert_user(self, telegram_id: int, username: str = "", first_name: str = "", timezone: str = "UTC") -> Dict[str, Any]:
        user_data = {
            "telegram_id": telegram_id,
            "username": username,
            "first_name": first_name,
            "timezone": timezone,
        }
        if self.has_supabase:
            try:
                res = self.client.table("users").upsert(user_data, on_conflict="telegram_id").execute()
                return res.data[0] if res.data else user_data
            except Exception:
                pass
        for u in IN_MEMORY_DB["users"]:
            if u["telegram_id"] == telegram_id:
                u.update(user_data)
                return u
        IN_MEMORY_DB["users"].append(user_data)
        return user_data

    async def get_user(self, telegram_id: int) -> Optional[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("users").select("*").eq("telegram_id", telegram_id).execute()
                return res.data[0] if res.data else None
            except Exception:
                pass
        for u in IN_MEMORY_DB["users"]:
            if u["telegram_id"] == telegram_id:
                return u
        return None

    async def update_user_preferences(self, telegram_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("users").update(update_data).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass
        for u in IN_MEMORY_DB["users"]:
            if u["telegram_id"] == telegram_id:
                u.update(update_data)
                return u
        raise ValueError("User not found")

    async def get_all_users(self) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("users").select("*").execute()
                return res.data or []
            except Exception:
                pass
        return IN_MEMORY_DB["users"]


db_service = SupabaseService()