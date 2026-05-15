// Idempotent schema. Used both by the CLI migrator and the runtime auto-bootstrap.
export const SCHEMA_SQL = `
  CREATE EXTENSION IF NOT EXISTS vector;

  CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS chatbots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Chat with us',
    system_prompt TEXT NOT NULL,
    welcome_message TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
    logo_url TEXT,
    primary_color VARCHAR(16) NOT NULL DEFAULT '#2563eb',
    enable_email_handoff BOOLEAN NOT NULL DEFAULT TRUE,
    enable_lead_form BOOLEAN NOT NULL DEFAULT TRUE,
    enable_booking BOOLEAN NOT NULL DEFAULT FALSE,
    handoff_email VARCHAR(255),
    booking_link TEXT,
    lead_form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    retrieval_top_k INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS knowledge_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    filename VARCHAR(512) NOT NULL,
    content_type VARCHAR(128) NOT NULL,
    size_bytes INTEGER NOT NULL,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID NOT NULL REFERENCES knowledge_docs(id) ON DELETE CASCADE,
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(512),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS knowledge_chunks_bot_idx ON knowledge_chunks(chatbot_id);
  CREATE INDEX IF NOT EXISTS knowledge_chunks_embed_idx
    ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

  CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    visitor_id VARCHAR(128) NOT NULL,
    visitor_name VARCHAR(255),
    visitor_email VARCHAR(255),
    page_url TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    content TEXT NOT NULL,
    tool_name VARCHAR(64),
    tool_input JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages(conversation_id);

  CREATE TABLE IF NOT EXISTS booking_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    start_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS booking_slots_bot_start_idx
    ON booking_slots(chatbot_id, start_at);

  CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES booking_slots(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(64),
    message TEXT,
    source VARCHAR(32) NOT NULL DEFAULT 'form',
    payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

export const DEFAULT_ADMIN_EMAIL = "wilform.thomas@gmail.com";
export const DEFAULT_ADMIN_PASSWORD = "power123";
