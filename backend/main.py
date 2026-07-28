from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.api.router import api_router
from backend.bot.telegram_bot import create_telegram_bot_app
from backend.bot.scheduler import start_scheduler

app = FastAPI(
    title="Notion-like Telegram SaaS API",
    description="Production backend powering Telegram Mini App and Gemini AI Bot",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.on_event("startup")
async def on_startup():
    start_scheduler()
    print(f"🚀 Backend service running on port {settings.PORT} [Environment: {settings.ENVIRONMENT}]")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Notion-like Telegram SaaS Backend",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.post("/bot/webhook")
async def telegram_webhook(request: Request):
    data = await request.json()
    return {"status": "ok"}
