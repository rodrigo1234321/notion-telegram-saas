from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging

scheduler = AsyncIOScheduler()

async def send_morning_digest():
    logging.info("[Scheduler] Sending daily morning productivity digest to active users.")

def start_scheduler():
    scheduler.add_job(send_morning_digest, "cron", hour=8, minute=0)
    try:
        scheduler.start()
        logging.info("[Scheduler] APScheduler started successfully.")
    except Exception as e:
        logging.warning(f"[Scheduler Warning]: {e}")
