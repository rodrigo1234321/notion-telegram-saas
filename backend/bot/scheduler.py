import asyncio
import logging
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import telegram.error

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

DEFAULT_REMINDER = {
    "reunion": 30,
    "evento": 30,
    "cita": 30,
    "medicamento": 0,
    "pastilla": 0,
}

REMINDER_MESSAGES = {
    0: "⏰ **RECORDATORIO:** ¡'{title}' es AHORA ({time})!",
    15: "⏰ **RECORDATORIO:** '{title}' empieza en 15 minutos ({time}).",
    30: "⏰ **RECORDATORIO:** '{title}' empieza en 30 minutos ({time}).",
    60: "⏰ **RECORDATORIO:** '{title}' empieza en 1 hora ({time}).",
    None: "⏰ **RECORDATORIO:** '{title}' empieza pronto ({time}).",
}


def _get_reminder_minutes(category: str) -> int:
    cat_lower = (category or "").lower()
    for key, val in DEFAULT_REMINDER.items():
        if key in cat_lower:
            return val
    return 15


async def _send_telegram_message(telegram_id: int, text: str):
    """Send a message via Telegram bot safely with fallback."""
    try:
        from backend.bot.telegram_bot import get_bot_app
    except ModuleNotFoundError:
        try:
            from bot.telegram_bot import get_bot_app
        except Exception:
            logger.warning("[Scheduler] Cannot import bot app")
            return

    app = get_bot_app()
    if not app or not app.bot:
        logger.warning("[Scheduler] Bot instance not available for notification")
        return

    try:
        await app.bot.send_message(chat_id=telegram_id, text=text, parse_mode="Markdown")
        logger.info(f"[Scheduler] Sent notification to {telegram_id}")
    except telegram.error.BadRequest:
        try:
            await app.bot.send_message(chat_id=telegram_id, text=text, parse_mode=None)
            logger.info(f"[Scheduler] Sent fallback plain text notification to {telegram_id}")
        except Exception as e:
            logger.error(f"[Scheduler] Failed plain text notification to {telegram_id}: {e}")
    except Exception as e:
        logger.error(f"[Scheduler] Failed to send notification to {telegram_id}: {e}")


def _parse_iso_datetime(dt_str: str) -> datetime | None:
    if not dt_str:
        return None
    try:
        dt_clean = dt_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(dt_clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception as e:
        logger.warning(f"[Scheduler] Date parse error for '{dt_str}': {e}")
        return None


async def poll_reminders():
    """Poll database and in-memory events for pending reminders every minute."""
    logger.info("[Scheduler] Polling calendar reminders...")
    now_utc = datetime.now(timezone.utc)

    try:
        events = await db_service.get_pending_reminders()
        if not events:
            return

        for event in events:
            event_id = event.get("id")
            telegram_id = event.get("telegram_id")
            title = event.get("title", "Evento")
            start_str = event.get("start_time", "")

            if not telegram_id or not start_str:
                continue

            start_dt = _parse_iso_datetime(start_str)
            if not start_dt:
                continue

            reminder_min = event.get("reminder_minutes_before")
            if reminder_min is None:
                reminder_min = _get_reminder_minutes(event.get("category", ""))

            reminder_time = start_dt - timedelta(minutes=reminder_min)

            # Trigger reminder if now_utc >= reminder_time and event hasn't expired > 30 mins
            if now_utc >= reminder_time and (now_utc - start_dt).total_seconds() < 1800:
                time_display = start_dt.strftime("%H:%M UTC")
                msg_template = REMINDER_MESSAGES.get(reminder_min, REMINDER_MESSAGES[None])
                text = msg_template.format(title=title, time=time_display)

                await _send_telegram_message(telegram_id, text)
                await db_service.mark_reminder_sent(event_id)
                logger.info(f"[Scheduler] Reminder executed and marked sent for event '{title}' ({event_id})")

    except Exception as e:
        logger.error(f"[Scheduler] Error polling reminders: {e}")


def start_scheduler():
    """Start APScheduler with reminder polling."""
    try:
        if not scheduler.running:
            scheduler.add_job(poll_reminders, IntervalTrigger(minutes=1), id="reminder_poll", replace_existing=True)
            scheduler.start()
            logger.info("[Scheduler] APScheduler started successfully — polling every 1 minute")
    except Exception as e:
        logger.warning(f"[Scheduler] APScheduler start notice: {e}")
