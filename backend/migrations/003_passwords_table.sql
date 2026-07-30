-- Migration: 003_passwords_table.sql
-- Description: Create passwords table for Bóveda de Contraseñas

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

ALTER TABLE passwords ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'passwords' AND policyname = 'service_role_all_passwords'
    ) THEN
        CREATE POLICY service_role_all_passwords ON passwords FOR ALL USING (true);
    END IF;
END $$;
