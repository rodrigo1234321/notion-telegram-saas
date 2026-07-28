-- Migration: 002_get_calendar_reminders.sql
-- Description: Add reminder columns, user location fields, and local_reviews table

-- Columnas de recordatorios en calendar_events
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS reminder_minutes_before INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Location en usuarios
ALTER TABLE users
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Tabla de reseñas locales
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

ALTER TABLE local_reviews ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'local_reviews' AND policyname = 'service_role_all_reviews'
    ) THEN
        CREATE POLICY service_role_all_reviews ON local_reviews FOR ALL USING (true);
    END IF;
END $$;
