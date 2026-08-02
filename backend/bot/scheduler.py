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

try:
    from backend.reminder_rules import get_default_reminder_minutes, REMINDER_MESSAGES
except ModuleNotFoundError:
    from reminder_rules import get_default_reminder_minutes, REMINDER_MESSAGES

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _send_telegram_message(telegram_id: int, text: str):
    """Send a message via Telegram bot safely with HTML formatting fallback."""
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
        await app.bot.send_message(chat_id=telegram_id, text=text, parse_mode="HTML")
        logger.info(f"[Scheduler] Sent HTML notification to {telegram_id}")
    except telegram.error.BadRequest as e:
        logger.warning(f"[Scheduler] HTML parse warning ({e}), falling back to plain text")
        try:
            await app.bot.send_message(chat_id=telegram_id, text=text, parse_mode=None)
            logger.info(f"[Scheduler] Sent fallback plain text notification to {telegram_id}")
        except Exception as ex:
            logger.error(f"[Scheduler] Failed plain text notification to {telegram_id}: {ex}")
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


async def run_cleanup_job():
    """Run periodic cleanup for events older than 24 hours."""
    try:
        count = await db_service.cleanup_old_events()
        if count > 0:
            logger.info(f"[Scheduler Cleanup] Cleaned up {count} expired events older than 24h.")
    except Exception as e:
        logger.error(f"[Scheduler Cleanup Error] {e}")


async def poll_reminders():
    """Poll database and in-memory events for pending reminders every minute."""
    now_utc = datetime.now(timezone.utc)
    arg_tz = ZoneInfo("America/Argentina/Buenos_Aires")
    now_local = now_utc.astimezone(arg_tz)
    logger.info(f"[Scheduler] Polling reminders at {now_local.strftime('%H:%M:%S')} AR / {now_utc.strftime('%H:%M:%S')} UTC")

    try:
        events = await db_service.get_pending_reminders()
        logger.info(f"[Scheduler] Found {len(events)} pending reminder(s)")
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
                reminder_min = get_default_reminder_minutes(event.get("category", ""))

            # Convert time for display to local time
            start_local = start_dt.astimezone(arg_tz)
            time_display = start_local.strftime("%H:%M")

            msg_template = REMINDER_MESSAGES.get(reminder_min, REMINDER_MESSAGES[None])
            text = msg_template.format(title=title, time=time_display)

            await _send_telegram_message(telegram_id, text)
            await db_service.mark_reminder_sent(event_id)
            logger.info(f"[Scheduler] Reminder executed and marked sent for event '{title}' ({event_id})")

    except Exception as e:
        logger.error(f"[Scheduler] Error polling reminders: {e}")

def start_scheduler():
    """Start APScheduler with reminder polling and cleanup jobs."""
    try:
        if not scheduler.running:
            scheduler.add_job(poll_reminders, IntervalTrigger(minutes=1), id="reminder_poll", replace_existing=True)
            scheduler.add_job(run_cleanup_job, IntervalTrigger(hours=1), id="cleanup_old_events", replace_existing=True)
            scheduler.start()
            logger.info("[Scheduler] APScheduler started successfully — polling every 1 minute & cleanup hourly")
            logger.info(f"[Scheduler] Jobs registered: {[str(j) for j in scheduler.get_jobs()]}")
        else:
            logger.info("[Scheduler] APScheduler already running, skipping start.")
    except Exception as e:
        logger.error(f"[Scheduler] CRITICAL: APScheduler failed to start: {e}", exc_info=True)
        # Retry with a fresh scheduler instance
        try:
            import asyncio
            new_scheduler = AsyncIOScheduler()
            new_scheduler.add_job(poll_reminders, IntervalTrigger(minutes=1), id="reminder_poll", replace_existing=True)
            new_scheduler.add_job(run_cleanup_job, IntervalTrigger(hours=1), id="cleanup_old_events", replace_existing=True)
            new_scheduler.start()
            # Replace module-level scheduler reference
            globals()['scheduler'] = new_scheduler
            logger.info("[Scheduler] APScheduler recovery successful with new instance!")
        except Exception as e2:
            logger.error(f"[Scheduler] CRITICAL: Recovery also failed: {e2}", exc_info=True)

