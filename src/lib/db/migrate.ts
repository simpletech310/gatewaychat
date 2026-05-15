import "dotenv/config";
import postgres from "postgres";

// Bootstraps the schema for a fresh Postgres database. Idempotent — safe to run repeatedly.
// We use raw SQL rather than drizzle-kit migrations to keep `vector` and the pgvector
// extension under our own control.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = postgres(url, { max: 1, prepare: false });

  await sql.unsafe(`
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
  `);

  console.log("Schema applied.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
