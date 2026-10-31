-- ============================================================================
-- VIDEM CORE - SUPABASE DATABASE SCHEMA
-- Operations: Lead Management, 2-Hour Demo Queue, and LangChain AI Chat Memory
-- ============================================================================

-- 1. TABLA DE USUARIOS / PROSPECTOS (CRM en tiempo real)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100),
    status VARCHAR(30) DEFAULT 'lead', 
    -- Posibles estados:
    -- 'lead': Prospecto nuevo sin prueba
    -- 'demo_queued': En cola de espera por turno
    -- 'demo_active': Disfrutando de sus 2 horas de demo
    -- 'demo_expired': Prueba de 2h finalizada (listo para seguimiento)
    -- 'payment_pending': Notificó que desea pagar (Camilo alertado)
    -- 'customer_vip': Membresía oficial activa
    tv_brand VARCHAR(50),
    interested_plan VARCHAR(30) DEFAULT '1_mes', -- '1_mes', 'semestral', 'anual'
    notes TEXT,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE ROTACIÓN Y COLA DE ESPERA DE DEMOS (Time-Boxed Slots de 2 Horas)
CREATE TABLE IF NOT EXISTS demo_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_phone VARCHAR(30) REFERENCES users(phone) ON DELETE CASCADE,
    tv_code VARCHAR(10) NOT NULL,
    account_email VARCHAR(100) DEFAULT 'vip.8294@videm.tv',
    queue_position INT DEFAULT 0, -- 0: En pantalla ahora mismo; 1: Turno #1 en cola; 2: Turno #2...
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'queued', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE MEMORIA CONVERSACIONAL (Para LangChain / n8n Postgres Chat Memory)
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL, -- Identificador de sesión (phone del cliente)
    message JSONB NOT NULL,            -- Estructura { "type": "human"|"ai", "data": { "content": "..." } }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de alto rendimiento para búsquedas instantáneas
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_status ON demo_sessions(status);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_queue ON demo_sessions(queue_position);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- Función auxiliar para consultar el fin de la última demo activa o en cola
CREATE OR REPLACE FUNCTION get_next_available_demo_slot()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    next_slot TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT COALESCE(MAX(scheduled_end), NOW())
    INTO next_slot
    FROM demo_sessions
    WHERE status IN ('active', 'queued') AND scheduled_end > NOW();

    RETURN next_slot;
END;
$$ LANGUAGE plpgsql;
