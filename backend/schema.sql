-- ==========================================
-- DDL SCHEMA FOR TELEGRAM SAAS PRODUCTIVITY APP
-- SUPABASE POSTGRESQL + ROW LEVEL SECURITY (RLS)
-- ==========================================

-- 1. USUARIOS
CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language_code VARCHAR(10) DEFAULT 'es',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    city VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. MEMORIA A LARGO PLAZO DE LA IA
CREATE TABLE IF NOT EXISTS ai_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'preferencia', 'personal', 'meta', 'habito'
    fact_key VARCHAR(100) NOT NULL,
    fact_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CALENDARIO Y BLOQUES DE TIEMPO
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    is_all_day BOOLEAN DEFAULT FALSE,
    google_event_id VARCHAR(255),
    reminder_minutes_before INT DEFAULT NULL,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PROYECTOS Y TAREAS KANBAN
CREATE TABLE IF NOT EXISTS kanban_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo', -- 'todo', 'in_progress', 'done'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    due_date TIMESTAMP WITH TIME ZONE,
    position INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. FINANZAS Y PRESUPUESTOS
CREATE TABLE IF NOT EXISTS financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'income', 'expense'
    amount DECIMAL(12, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    record_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. HÁBITOS Y METAS
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_frequency VARCHAR(20) DEFAULT 'daily',
    streak_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_date DATE DEFAULT CURRENT_DATE,
    UNIQUE(habit_id, completed_date)
);

-- 7. WIKI Y NOTAS
CREATE TABLE IF NOT EXISTS wiki_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_json JSONB, -- Estructura rica tipo Notion
    tags TEXT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. BÓVEDA DE CONTRASEÑAS
CREATE TABLE IF NOT EXISTS passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    password_value TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Personal',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_events_user_date ON calendar_events(telegram_id, start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON kanban_tasks(telegram_id, status);
CREATE INDEX IF NOT EXISTS idx_finance_user_date ON financial_records(telegram_id, record_date);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(telegram_id);
CREATE INDEX IF NOT EXISTS idx_wiki_user ON wiki_notes(telegram_id);
CREATE INDEX IF NOT EXISTS idx_passwords_user ON passwords(telegram_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE passwords ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY service_role_all_users ON users FOR ALL USING (true);
CREATE POLICY service_role_all_memories ON ai_memories FOR ALL USING (true);
CREATE POLICY service_role_all_events ON calendar_events FOR ALL USING (true);
CREATE POLICY service_role_all_tasks ON kanban_tasks FOR ALL USING (true);
CREATE POLICY service_role_all_finance ON financial_records FOR ALL USING (true);
CREATE POLICY service_role_all_habits ON habits FOR ALL USING (true);
CREATE POLICY service_role_all_habit_logs ON habit_logs FOR ALL USING (true);
CREATE POLICY service_role_all_wiki ON wiki_notes FOR ALL USING (true);
CREATE POLICY service_role_all_passwords ON passwords FOR ALL USING (true);
