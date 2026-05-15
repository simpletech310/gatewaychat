# GatewayChat

Lightweight, multi-tenant chatbot management. Create chatbots, give each one a system prompt and a knowledge base, generate an embed snippet, and drop a chat bubble onto any client's website.

## What it does

- **Per-client chatbots** — name, title, system prompt, logo, color, welcome message
- **RAG knowledge base** — upload `.pdf`, `.docx`, `.txt`, `.md` **or scrape a whole website**. Content is chunked, embedded with Voyage `voyage-3-lite`, and retrieved at chat time via pgvector cosine search
- **Tool-using agent** — Claude Haiku 4.5 with these configurable tools:
  - `send_email_to_human` — notifies your team via Resend when the visitor wants to talk to a person
  - `submit_lead_form` — captures contact info into the leads table
  - `list_available_appointment_slots` + `book_appointment` — built-in booking system. Slots disappear when chosen, no double-booking
  - `share_booking_link` — optional fallback to an external Cal.com/Calendly link
- **Built-in booking** — publish time slots in the admin, the bot offers them to visitors, slots are atomically claimed
- **Admin portal** — list/create/edit bots, upload knowledge or scrape sites, manage booking slots, view conversations & leads (CSV export), copy embed snippet
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

### Seed the Travis demo bot for 4everforward.net

After running `db:migrate` and `seed`:

```bash
npm run seed:travis
```

This will:
1. Create a chatbot named **Travis** with a 4Ever Forward–tailored system prompt
2. Crawl `https://www.4everforward.net/` (up to ~15 pages), chunk + embed the content
3. Add 15 sample 30-min booking slots across the next two weekdays
4. Print the embed snippet you can paste into the 4Ever Forward site

Optional env: `TRAVIS_HANDOFF_EMAIL=team@4everforward.net` to override the default notification address.

## Deploy to Vercel

The build does **not** require any env vars to be set — DB and external API clients are lazy. You can deploy the project first and add env vars after.

### 1. Push to GitHub, import in Vercel

```bash
git push -u origin <your-branch>
```

Then **New Project → Import** from your GitHub repo. Vercel detects Next.js automatically.

### 2. Add env vars in the Vercel dashboard

In **Project → Settings → Environment Variables**, add each of the following for *Production*, *Preview*, and *Development*. The app reads them straight from `process.env` — no manual loading code.

| Variable | Required | Example / Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string with `pgvector`. Easiest: provision a free Neon DB and paste its connection string |
| `ANTHROPIC_API_KEY` | ✅ | From console.anthropic.com (use a freshly-rotated key) |
| `VOYAGE_API_KEY` | ✅ | From dash.voyageai.com — needed for embeddings |
| `RESEND_API_KEY` | ✅ | From resend.com/api-keys (use a freshly-rotated key) |
| `RESEND_FROM_EMAIL` | ✅ | e.g. `GatewayChat <notifications@yourdomain.com>` — the sending domain must be verified in Resend, or use `onboarding@resend.dev` for testing |
| `AUTH_SECRET` | ✅ | Any 32+ char random string. Generate with `openssl rand -hex 32` |
| `ADMIN_EMAIL` | ✅ | First admin user's login email |
| `ADMIN_PASSWORD` | ✅ | First admin user's password (used only by `npm run seed`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | e.g. `https://your-app.vercel.app` — used in the embed snippet |
| `TRAVIS_HANDOFF_EMAIL` | optional | Defaults to `wilform.thomas@gmail.com` for the Travis bot |

After saving the env vars, hit **Deployments → Redeploy** so the running app picks them up.

### 3. Log in — schema and admin user are auto-created on first request

The first time anyone POSTs to `/api/auth/login`, the server runs the idempotent schema SQL and inserts the default admin user (`wilform.thomas@gmail.com` / `power123`) if no admin exists. You can override those defaults by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Vercel before the first login.

So all you need to do is:

1. Open `https://your-app.vercel.app/login`
2. Sign in with `wilform.thomas@gmail.com` / `power123` (or your overridden values)

⚠️ **`power123` is a weak demo password** — change `ADMIN_PASSWORD` in Vercel env vars and re-run `npm run seed` from your laptop (or hit the DB directly) once you're past initial testing.

### 4. Seed the Travis bot (one-time, from your laptop)

```bash
cp .env.example .env
# paste the same DATABASE_URL / ANTHROPIC_API_KEY / VOYAGE_API_KEY values you set on Vercel
npm install
npm run seed:travis     # creates Travis, scrapes 4everforward.net, adds sample slots
```

The script prints the embed `<script>` snippet to paste into 4everforward.net.

### Notes

- The Hobby plan caps serverless function duration at 60s. The scrape endpoint is set to 60s — a 12-page crawl usually finishes in under 30s. If you're on Pro, you can bump `vercel.json` and the route's `maxDuration` to 300s for very large sites.
- The widget endpoint and the public chat endpoint are CORS-open, so the embed snippet works from any origin.

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
