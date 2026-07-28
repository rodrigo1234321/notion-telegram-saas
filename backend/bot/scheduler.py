import asyncio
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

try:
    from backend.config import settings
    from backend.database import db_service
except ModuleNotFoundError:
    from config import settings
    from database import db_service

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


# ── Default reminder minutes by category ──
DEFAULT_REMINDER = {
    "reunion": 30,
    "evento": 30,
    "cita": 30,
    "medicamento": 0,
    "pastilla": 0,
}

REMINDER_MESSAGES = {
    0: "⏰ **{title}** es ahora! ({time})",
    30: "⏰ **{title}** empieza en 30 minutos ({time})",
    None: "⏰ **{title}** empieza pronto ({time})",
}


def _get_reminder_minutes(category: str) -> int:
    """Get reminder minutes for a category, defaulting to 30."""
    cat_lower = (category or "").lower()
    for key, val in DEFAULT_REMINDER.items():
        if key in cat_lower:
            return val
    return 30


async def _send_telegram_message(telegram_id: int, text: str):
    """Send a message via the Telegram bot."""
    try:
        from backend.bot.telegram_bot import get_bot_app
    except ModuleNotFoundError:
        try:
            from bot.telegram_bot import get_bot_app
        except Exception:
            logger.warning("Cannot import bot app for sending messages")
            return

    try:
        app = get_bot_app()
        if app:
            await app.bot.send_message(chat_id=telegram_id, text=text, parse_mode="Markdown")
            logger.info(f"Sent reminder to {telegram_id}")
    except Exception as e:
        logger.error(f"Failed to send Telegram message to {telegram_id}: {e}")


async def poll_reminders():
    """Poll database for pending reminders and send them."""
    if not db_service.has_supabase:
        return

    try:
        # Find events that need reminders
        # Query: events where reminder_sent=FALSE and start_time - reminder_minutes <= NOW()
        events = db_service.client.table("calendar_events").select("*").eq("reminder_sent", False).execute()

        now = datetime.now(timezone.utc)
        events_to_remind = []

        for event in (events.data or []):
            start_str = event.get("start_time")
            if not start_str:
                continue

            start_time = datetime.fromisoformat(start_str.replace("Z", "+00:00"))

            # Get reminder_minutes: event-specific or category default
            reminder_min = event.get("reminder_minutes_before")
            if reminder_min is None:
                reminder_min = _get_reminder_minutes(event.get("category", ""))

            reminder_time = start_time - __import__("datetime").timedelta(minutes=reminder_min)

            if now >= reminder_time:
                events_to_remind.append(event)

        # Send reminders
        for event in events_to_remind:
            telegram_id = event["telegram_id"]
            title = event["title"]
            start_str = event.get("start_time", "")
            try:
                start_time = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                time_display = start_time.strftime("%H:%M")
            except Exception:
                time_display = start_str

            reminder_min = event.get("reminder_minutes_before")
            if reminder_min is None:
                reminder_min = _get_reminder_minutes(event.get("category", ""))

            msg_template = REMINDER_MESSAGES.get(reminder_min, REMINDER_MESSAGES[None])
            text = msg_template.format(title=title, time=time_display)

            await _send_telegram_message(telegram_id, text)

            # Mark as sent
            db_service.client.table("calendar_events").update({"reminder_sent": True}).eq("id", event["id"]).execute()
            logger.info(f"Reminder sent for event '{title}' to {telegram_id}")

    except Exception as e:
        logger.error(f"Error polling reminders: {e}")


async def send_morning_digest():
    """Send morning digest to all active users: weather + agenda + tasks."""
    if not db_service.has_supabase:
        logger.info("[Scheduler] Skipping morning digest - no Supabase configured")
        return

    try:
        # Get all users
        users_res = db_service.client.table("users").select("*").execute()
        users = users_res.data or []

        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")

        for user in users:
            telegram_id = user["telegram_id"]
            timezone_str = user.get("timezone", "America/Argentina/Buenos_Aires")
            try:
                tz = ZoneInfo(timezone_str)
            except Exception:
                tz = ZoneInfo("America/Argentina/Buenos_Aires")

            user_now = now.astimezone(tz)
            city = user.get("city", "")
            lat = user.get("latitude")
            lng = user.get("longitude")

            # Weather
            weather_text = ""
            try:
                if lat and lng:
                    import httpx
                    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current_weather=true&timezone=auto"
                    async with httpx.AsyncClient() as client:
                        resp = await client.get(url, timeout=5.0)
                        if resp.status_code == 200:
                            data = resp.json()
                            cw = data.get("current_weather", {})
                            temp = cw.get("temperature", "?")
                            code = cw.get("weathercode", 0)
                            desc = _weather_code_to_text(code)
                            weather_text = f"🌤 **Clima en {city or 'tu zona'}**: {temp}°C — {desc}\n\n"
            except Exception as e:
                logger.warning(f"Weather fetch failed for {telegram_id}: {e}")

            # Today's events
            events_text = ""
            try:
                events_res = db_service.client.table("calendar_events").select("*").eq("telegram_id", telegram_id).gte("start_time", f"{today_str}T00:00:00Z").lte("start_time", f"{today_str}T23:59:59Z").order("start_time").execute()
                events = events_res.data or []
                if events:
                    lines = []
                    for ev in events:
                        try:
                            st = datetime.fromisoformat(ev["start_time"].replace("Z", "+00:00")).astimezone(tz)
                            lines.append(f"  • {st.strftime('%H:%M')} — {ev['title']}")
                        except Exception:
                            lines.append(f"  • {ev['title']}")
                    events_text = "📅 **Eventos de hoy:**\n" + "\n".join(lines) + "\n\n"
                else:
                    events_text = "📅 **Hoy no tenés eventos.**\n\n"
            except Exception as e:
                logger.warning(f"Events fetch failed: {e}")

            # Pending Kanban tasks
            tasks_text = ""
            try:
                tasks_res = db_service.client.table("kanban_tasks").select("*").eq("telegram_id", telegram_id).in_("status", ["todo", "in_progress"]).order("due_date").limit(5).execute()
                tasks = tasks_res.data or []
                if tasks:
                    lines = []
                    for t in tasks:
                        due = ""
                        if t.get("due_date"):
                            try:
                                d = datetime.fromisoformat(t["due_date"].replace("Z", "+00:00")).astimezone(tz)
                                due = f" (vence {d.strftime('%d/%m')})"
                            except Exception:
                                pass
                        lines.append(f"  • {t['title']}{due}")
                    tasks_text = "📋 **Pendientes:**\n" + "\n".join(lines)
                else:
                    tasks_text = "📋 **No tenés tareas pendientes.**"
            except Exception as e:
                logger.warning(f"Tasks fetch failed: {e}")

            # Compose and send
            greeting = f"¡Buenos días, {user.get('first_name', 'amigo')}! 👋\n\n"
            full_text = greeting + weather_text + events_text + tasks_text

            await _send_telegram_message(telegram_id, full_text)
            logger.info(f"Morning digest sent to {telegram_id}")

    except Exception as e:
        logger.error(f"Error in morning digest: {e}")


def _weather_code_to_text(code: int) -> str:
    """Map Open-Meteo weather code to description."""
    mapping = {
        0: "Despejado",
        1: "Mayormente despejado",
        2: "Parcialmente nublado",
        3: "Nublado",
        45: "Niebla",
        48: "Niebla con escarcha",
        51: "Lluvia ligera",
        53: "Lluvia moderada",
        55: "Lluvia intensa",
        61: "Lluvia",
        63: "Lluvia fuerte",
        65: "Lluvia muy fuerte",
        71: "Nieve ligera",
        73: "Nieve moderada",
        75: "Nieve fuerte",
        80: "Chubascos",
        81: "Chubascos moderados",
        82: "Chubascos fuertes",
        95: "Tormenta eléctrica",
        96: "Tormenta con granizo",
        99: "Tormenta fuerte con granizo",
    }
    return mapping.get(code, "Clima variable")


def start_scheduler():
    """Start APScheduler with reminder polling and morning digest."""
    # Poll reminders every minute
    scheduler.add_job(poll_reminders, IntervalTrigger(minutes=1), id="reminder_poll", replace_existing=True)

    # Morning digest at 8:00 AM Argentina time
    scheduler.add_job(
        send_morning_digest,
        "cron",
        hour=8,
        minute=0,
        timezone="America/Argentina/Buenos_Aires",
        id="morning_digest",
        replace_existing=True,
    )

    try:
        scheduler.start()
        logger.info("[Scheduler] APScheduler started — reminder polling + morning digest active")
    except Exception as e:
        logger.warning(f"[Scheduler] APScheduler start failed: {e}")
