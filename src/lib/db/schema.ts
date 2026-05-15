import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  uuid,
  index,
  customType,
} from "drizzle-orm/pg-core";

// pgvector column (512 dim for voyage-3-lite).
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(512)";
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string) {
    return value
      .slice(1, -1)
      .split(",")
      .map((v) => Number(v));
  },
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatbots = pgTable("chatbots", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull().default("Chat with us"),
  systemPrompt: text("system_prompt").notNull(),
  welcomeMessage: text("welcome_message").notNull().default("Hi! How can I help you today?"),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 16 }).notNull().default("#2563eb"),
  // Action toggles
  enableEmailHandoff: boolean("enable_email_handoff").notNull().default(true),
  enableLeadForm: boolean("enable_lead_form").notNull().default(true),
  enableBooking: boolean("enable_booking").notNull().default(false),
  // Action config
  handoffEmail: varchar("handoff_email", { length: 255 }),
  bookingLink: text("booking_link"),
  leadFormFields: jsonb("lead_form_fields").$type<LeadFormField[]>().notNull().default([]),
  // RAG config
  retrievalTopK: integer("retrieval_top_k").notNull().default(5),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LeadFormField = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea";
  required: boolean;
};

export const knowledgeDocs = pgTable("knowledge_docs", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatbotId: uuid("chatbot_id")
    .notNull()
    .references(() => chatbots.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 512 }).notNull(),
  contentType: varchar("content_type", { length: 128 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  chunkCount: integer("chunk_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    docId: uuid("doc_id")
      .notNull()
      .references(() => knowledgeDocs.id, { onDelete: "cascade" }),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbots.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    botIdx: index("knowledge_chunks_bot_idx").on(table.chatbotId),
  }),
);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatbotId: uuid("chatbot_id")
    .notNull()
    .references(() => chatbots.id, { onDelete: "cascade" }),
  visitorId: varchar("visitor_id", { length: 128 }).notNull(),
  visitorName: varchar("visitor_name", { length: 255 }),
  visitorEmail: varchar("visitor_email", { length: 255 }),
  pageUrl: text("page_url"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
});

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull(), // "user" | "assistant" | "tool"
    content: text("content").notNull(),
    toolName: varchar("tool_name", { length: 64 }),
    toolInput: jsonb("tool_input"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    convIdx: index("messages_conv_idx").on(table.conversationId),
  }),
);

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatbotId: uuid("chatbot_id")
    .notNull()
    .references(() => chatbots.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 64 }),
  message: text("message"),
  source: varchar("source", { length: 32 }).notNull().default("form"), // "form" | "email_handoff"
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Chatbot = typeof chatbots.$inferSelect;
export type NewChatbot = typeof chatbots.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Lead = typeof leads.$inferSelect;
