# Graph Report - .  (2026-08-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 356 nodes · 558 edges · 24 communities (22 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b5c593e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- triggerHaptic
- database.py
- SupabaseService
- dependencies
- compilerOptions
- main.py
- devDependencies
- GeminiAIEngine
- security.py
- habits.py
- calendar.py
- finance.py
- kanban.py
- wiki.py
- MonthGrid.tsx
- Navbar.tsx
- FinanceCharts.tsx
- frontend/vercel.json
- vercel.json
- next.config.js
- next-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `SupabaseService` - 29 edges
2. `triggerHaptic()` - 23 edges
3. `compilerOptions` - 16 edges
4. `GeminiAIEngine` - 11 edges
5. `get_current_telegram_user()` - 10 edges
6. `Card()` - 10 edges
7. `Button()` - 9 edges
8. `create_telegram_bot_app()` - 8 edges
9. `get_bot_app()` - 8 edges
10. `Modal()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `create_telegram_bot_app()` --indirect_call--> `handle_start_command()`  [INFERRED]
  backend/bot/telegram_bot.py → backend/bot/handlers_chat.py
- `create_telegram_bot_app()` --indirect_call--> `handle_text_message()`  [INFERRED]
  backend/bot/telegram_bot.py → backend/bot/handlers_chat.py
- `_send_telegram_message()` --calls--> `get_bot_app()`  [EXTRACTED]
  backend/bot/scheduler.py → backend/bot/telegram_bot.py
- `CalendarPage()` --calls--> `triggerHaptic()`  [EXTRACTED]
  frontend/src/app/calendar/page.tsx → frontend/src/lib/telegram.ts
- `FinancePage()` --calls--> `triggerHaptic()`  [EXTRACTED]
  frontend/src/app/finance/page.tsx → frontend/src/lib/telegram.ts

## Import Cycles
- None detected.

## Communities (24 total, 2 thin omitted)

### Community 0 - "triggerHaptic"
Cohesion: 0.12
Nodes (32): CalendarEvent, CalendarPage(), DEFAULT_CATEGORIES, FinancePage(), FinanceRecord, MONTH_NAMES, Habit, HabitsPage() (+24 more)

### Community 1 - "database.py"
Cohesion: 0.08
Nodes (26): get_system_prompt(), Generate system prompt with current date/time in user's timezone., add_calendar_event(), create_kanban_task(), get_weather_forecast(), log_habit(), Any, Save a password entry in the secure vault. (+18 more)

### Community 2 - "SupabaseService"
Cohesion: 0.10
Nodes (3): Any, Deletes events that passed more than 24 hours ago., SupabaseService

### Community 3 - "dependencies"
Cohesion: 0.07
Nodes (27): axios, clsx, framer-motion, dependencies, axios, clsx, framer-motion, leaflet (+19 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 5 - "main.py"
Cohesion: 0.17
Nodes (20): Application, handle_start_command(), handle_text_message(), Send message trying Markdown/HTML first, falling back to plain text on parse…, send_safe_reply(), Start APScheduler with reminder polling and cleanup jobs., start_scheduler(), create_telegram_bot_app() (+12 more)

### Community 6 - "devDependencies"
Cohesion: 0.08
Nodes (23): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom (+15 more)

### Community 7 - "GeminiAIEngine"
Cohesion: 0.13
Nodes (11): GeminiAIEngine, Any, Fallback rule-based processing when Gemini is not available., Basic calendar fallback - create a simple event., Basic Kanban fallback., Basic finance fallback., Basic habit fallback., Basic memory fallback. (+3 more)

### Community 8 - "security.py"
Cohesion: 0.13
Nodes (18): create_password(), delete_password(), get_passwords(), Any, delete, get, post, get_me() (+10 more)

### Community 9 - "habits.py"
Cohesion: 0.21
Nodes (13): create_habit(), delete_habit(), get_habits(), HabitCreate, HabitLogCreate, HabitUpdate, log_habit(), BaseModel (+5 more)

### Community 10 - "calendar.py"
Cohesion: 0.21
Nodes (11): CalendarEventCreate, CalendarEventUpdate, create_event(), delete_event(), get_events(), BaseModel, delete, get (+3 more)

### Community 11 - "finance.py"
Cohesion: 0.21
Nodes (11): create_record(), delete_record(), FinanceRecordCreate, FinanceRecordUpdate, get_records(), BaseModel, delete, get (+3 more)

### Community 12 - "kanban.py"
Cohesion: 0.21
Nodes (11): create_task(), delete_task(), get_tasks(), KanbanTaskCreate, KanbanTaskUpdate, BaseModel, delete, get (+3 more)

### Community 13 - "wiki.py"
Cohesion: 0.21
Nodes (11): create_note(), delete_note(), get_notes(), BaseModel, delete, get, patch, post (+3 more)

### Community 14 - "MonthGrid.tsx"
Cohesion: 0.29
Nodes (7): CATEGORY_COLORS, DAYS_ES, Event, MonthGrid(), MonthGridProps, MONTHS_ES, toISODate()

### Community 15 - "Navbar.tsx"
Cohesion: 0.40
Nodes (3): metadata, Navbar(), navItems

### Community 16 - "FinanceCharts.tsx"
Cohesion: 0.33
Nodes (5): DYNAMIC_PALETTE, FinanceCharts(), FinanceChartsProps, FinanceRecord, PRESET_COLORS

### Community 17 - "frontend/vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, outputDirectory

### Community 18 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, outputDirectory

## Knowledge Gaps
- **82 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+77 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SupabaseService` connect `SupabaseService` to `database.py`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `GeminiAIEngine` connect `GeminiAIEngine` to `database.py`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _82 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `triggerHaptic` be split into smaller, more focused modules?**
  _Cohesion score 0.1211840888066605 - nodes in this community are weakly interconnected._
- **Should `database.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08253968253968254 - nodes in this community are weakly interconnected._
- **Should `SupabaseService` be split into smaller, more focused modules?**
  _Cohesion score 0.1032258064516129 - nodes in this community are weakly interconnected._