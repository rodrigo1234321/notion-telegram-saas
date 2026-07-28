# 🤖 INSTRUCCIONES DEL SISTEMA Y REGLAS DEL AGENTE (AGENTS.md)

## 📌 PROPÓSITO DEL PROYECTO
Este repositorio contiene la arquitectura completa de producción para un **SaaS de Productividad Personal Notion-like alojado en Telegram**.

## 🏗️ ARQUITECTURA GENERAL
1. **Backend (`/backend`)**:
   - Framework: **FastAPI** (Python 3.10+)
   - Autenticación: Middleware HMAC-SHA256 para `Telegram initData`
   - Motor de IA: **Google Gemini 1.5 Flash** con **Function Calling** nativo.
   - Base de Datos: **Supabase PostgreSQL** con Row Level Security (RLS).
   - Bot Conversacional: `python-telegram-bot` (asíncrono).

2. **Frontend (`/frontend`)**:
   - Framework: **Next.js 14 (App Router)**
   - Estilos: **Tailwind CSS** + Variables CSS dinámicas del tema Telegram (`--tg-theme-*`).
   - Componentes: Lucide React, Framer Motion, Recharts.
   - SDK Telegram: `@telegram-apps/sdk-react`.

## 🛡️ REGLAS DE SEGURIDAD
- Ningún endpoint de FastAPI puede responder sin validar las cabeceras `Authorization` o `Telegram-Init-Data`.
- La clave `SERVICE_ROLE_KEY` de Supabase solo debe usarse en operaciones administrativas de backend.
- Nunca commitear credenciales o secretos en `.env`.
