# GatewayChat

Lightweight, multi-tenant chatbot management. Create chatbots, give each one a system prompt and a knowledge base, generate an embed snippet, and drop a chat bubble onto any client's website.

## What it does

- **Per-client chatbots** — name, title, system prompt, logo, color, welcome message
- **RAG knowledge base** — upload `.pdf`, `.docx`, `.txt`, `.md`. Files are chunked and embedded with Voyage `voyage-3-lite`, retrieved at chat time via pgvector cosine search
- **Tool-using agent** — Claude Haiku 4.5 with three configurable tools:
  - `send_email_to_human` — notifies your team via Resend when the visitor wants to talk to a person
  - `submit_lead_form` — captures contact info into the leads table
  - `share_booking_link` — hands out a Cal.com/Calendly link
- **Admin portal** — list/create/edit bots, upload knowledge, view conversations & leads (CSV export), copy embed snippet
- **Embed widget** — one `<script>` tag drops a chat bubble on any site. CORS-enabled, no framework required

## Stack

- Next.js 14 (App Router) on Vercel
- Postgres + `pgvector` (Vercel Postgres / Neon / Supabase)
- Drizzle ORM, raw SQL for vector ops
- Anthropic `claude-haiku-4-5-20251001` with prompt caching
- Voyage `voyage-3-lite` embeddings (512-dim, cheap)
- Resend for outbound email
- Tailwind CSS for the admin UI

## Setup

1. **Create a Postgres database** that supports `pgvector` (Neon free tier or Vercel Postgres both work).
2. **Copy env vars:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `DATABASE_URL`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `NEXT_PUBLIC_APP_URL`.
3. **Install + migrate + seed:**
   ```bash
   npm install
   npm run db:migrate   # creates schema and pgvector extension
   npm run seed         # seeds the admin user from ADMIN_EMAIL/ADMIN_PASSWORD
   ```
4. **Run it:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`, sign in, create a chatbot.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import into Vercel and add the env vars from `.env.example`.
3. After the first deploy, run the migrations once against the production DB:
   ```bash
   DATABASE_URL=... npm run db:migrate
   DATABASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed
   ```
4. Set `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://your-app.vercel.app`) so the embed snippet points to the right origin.

## Embedding on a client site

In the admin, open a chatbot → **Embed code** tab. Paste the snippet before `</body>`:

```html
<script
  async
  src="https://your-app.vercel.app/widget.js"
  data-bot-id="<the-bot-id>"
  data-api-base="https://your-app.vercel.app"
></script>
```

The widget reads its config from `/api/public/bots/<id>` and POSTs messages to `/api/chat/<id>`. Both endpoints are CORS-open so they work from any origin.

## Costs (rough)

- Claude Haiku 4.5: ~$1/MTok in, ~$5/MTok out. The system prompt + retrieved chunks are wrapped in a `cache_control: ephemeral` block — cached reads are ~$0.10/MTok, so repeat turns inside the same conversation are very cheap
- Voyage `voyage-3-lite`: $0.02/MTok — embedding a 100-page document costs pennies
- Postgres + Vercel: free tier covers small deployments

## Project layout

```
src/
  app/
    api/
      auth/{login,logout}            → admin login
      admin/bots/...                 → CRUD, knowledge upload, conversations, leads (auth-gated)
      public/bots/[id]               → widget bootstrap (CORS-open)
      chat/[botId]                   → public chat endpoint (CORS-open)
    admin/                           → admin UI (server + client components)
    login/                           → login page
    preview/[id]/                    → dev preview that loads the widget
  lib/
    db/                              → schema, connection, migrate, seed
    auth.ts                          → JWT session cookies
    chat.ts                          → RAG retrieval + Claude tool-use loop
    claude.ts, embeddings.ts         → API clients
    extract.ts, chunking.ts          → file parsing
    tools.ts                         → tool definitions for Claude
    email.ts                         → Resend wrapper
public/
  widget.js                          → the embeddable chat widget
```
