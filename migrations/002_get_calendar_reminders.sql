-- ==========================================
-- Migración: Agregar columnas y políticas RLS para recordatorios
-- Aplica para los recordatorios persistentes del Punto 4
-- ==========================================

-- Agregar columnas a calendar_events para reminders
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS reminder_minutes_before INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Agregar índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_reminders ON calendar_events(reminder_sent, reminder_minutes_before);
CREATE INDEX IF NOT EXISTS idx_calendar_events_reminder_calc ON calendar_events(reminder_sent, start_time);

-- ==========================================
-- Migración: Agregar ubicación al usuario para el Punto 5
-- Aplica para la ubicación del usuario y resumen matutino con clima
-- ==========================================

-- Agregar columnas a users para ubicación
ALTER TABLE users
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Crear índice para búsqueda por ubicación
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude);

-- ==========================================
-- Migración: Crear tabla local_reviews para el Punto 8
-- Aplica para reseñas con pin en mapa
-- ==========================================

-- Crear tabla local_reviews
CREATE TABLE IF NOT EXISTS local_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    place_name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS para local_reviews
ALTER TABLE local_reviews ENABLE ROW LEVEL SECURITY;

-- Política: permitir full access al service role (como el resto de las tablas)
CREATE POLICY service_role_all_reviews ON local_reviews FOR ALL USING (true);

-- ==========================================
-- Migraciones completas para implementación
-- ==========================================

-- 1. Fechas de remind (para el scheduler)
CREATE OR REPLACE FUNCTION calendar_events.reminder_calc()
RETURNS void AS $$
BEGIN
    -- Esta es una función placeholder para asegurar que el schema funciona correctamente
    NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Weather location (para el scheduler matutino)
CREATE OR REPLACE FUNCTION users.get_weather_location()
RETURNS TABLE(lat double precision, lon double precision, city text)
AS $$
BEGIN
    RETURN QUERY SELECT latitude, longitude, city FROM users WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Log de actividad audit (optional)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_all_activity ON activity_logs FOR ALL USING (true);

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON activity_logs(telegram_id, action);

-- Vista materializada para estadísticas diarias (para agregar después si es necesario)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_stats AS
SELECT
    DATE_TRUNC('day', created_at) as day,
    COUNT(*) as total_actions,
    telegram_id
FROM activity_logs
GROUP BY DATE_TRUNC('day', created_at), telegram_id;

-- Permisos para la vista materializada
ALTER MATERIALIZED VIEW daily_stats OWNER TO service_role;

-- Renovar el índice según sea necesario
-- REFRESH MATERIALIZED VIEW daily_stats;