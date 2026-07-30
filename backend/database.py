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
    "calendar_events": [],
    "kanban_tasks": [],
    "financial_records": [],
    "habits": [],
    "habit_logs": [],
    "wiki_notes": [],
    "passwords": []
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
                return res.data or []
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
        event_data["id"] = event_data.get("id") or str(uuid.uuid4())
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

    async def get_pending_reminders(self) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        pending = []
        if self.has_supabase:
            try:
                res = self.client.table("calendar_events").select("*").or_("reminder_sent.eq.false,reminder_sent.is.null").execute()
                for e in (res.data or []):
                    try:
                        start_str = e.get("start_time", "")
                        if not start_str:
                            continue
                        start = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                        if start.tzinfo is None:
                            start = start.replace(tzinfo=timezone.utc)
                        rem_min = e.get("reminder_minutes_before")
                        if rem_min is None:
                            rem_min = 15
                        diff_minutes = (start - now).total_seconds() / 60
                        if -5 <= diff_minutes <= rem_min:
                            pending.append(e)
                    except Exception:
                        pass
                return pending
            except Exception:
                pass
        for e in IN_MEMORY_DB["calendar_events"]:
            if not e.get("reminder_sent", False):
                try:
                    start_str = e.get("start_time", "")
                    if not start_str:
                        continue
                    start = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                    if start.tzinfo is None:
                        start = start.replace(tzinfo=timezone.utc)
                    rem_min = e.get("reminder_minutes_before")
                    if rem_min is None:
                        rem_min = 15
                    diff_minutes = (start - now).total_seconds() / 60
                    if -5 <= diff_minutes <= rem_min:
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

    # ===== PASSWORDS (BÓVEDA SEGUARA) =====
    async def get_user_passwords(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("passwords").select("*").eq("telegram_id", telegram_id).order("created_at", desc=True).execute()
                return res.data or []
            except Exception:
                pass
        return [p for p in IN_MEMORY_DB["passwords"] if p.get("telegram_id") == telegram_id]

    async def add_password(self, pwd_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.has_supabase:
            try:
                res = self.client.table("passwords").insert(pwd_data).execute()
                return res.data[0] if res.data else pwd_data
            except Exception:
                pass
        import uuid
        pwd_data["id"] = pwd_data.get("id") or str(uuid.uuid4())
        IN_MEMORY_DB["passwords"].append(pwd_data)
        return pwd_data

    async def delete_password(self, pwd_id: str, telegram_id: int) -> None:
        if self.has_supabase:
            try:
                res = self.client.table("passwords").delete().eq("id", pwd_id).eq("telegram_id", telegram_id).execute()
                if res.data:
                    return
            except Exception:
                pass
        for i, p in enumerate(IN_MEMORY_DB["passwords"]):
            if p["id"] == pwd_id and p.get("telegram_id") == telegram_id:
                IN_MEMORY_DB["passwords"].pop(i)
                return

    # ===== KANBAN TASKS =====
    async def get_user_tasks(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("kanban_tasks").select("*").eq("telegram_id", telegram_id).execute()
                return res.data or []
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
        task_data["id"] = task_data.get("id") or str(uuid.uuid4())
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

    # ===== FINANCE RECORDS =====
    async def get_user_finances(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("financial_records").select("*").eq("telegram_id", telegram_id).execute()
                return res.data or []
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
        finance_data["id"] = finance_data.get("id") or str(uuid.uuid4())
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
                return res.data or []
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
        habit_data["id"] = habit_data.get("id") or str(uuid.uuid4())
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

    # ===== WIKI NOTES =====
    async def get_user_wiki(self, telegram_id: int) -> List[Dict[str, Any]]:
        if self.has_supabase:
            try:
                res = self.client.table("wiki_notes").select("*").eq("telegram_id", telegram_id).execute()
                return res.data or []
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
        note_data["id"] = note_data.get("id") or str(uuid.uuid4())
        IN_MEMORY_DB["wiki_notes"].append(note_data)
        return note_data

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


db_service = SupabaseService()