import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { scrapeSite } from "../scraper";
import { chunkText } from "../chunking";
import { embed, toPgVector } from "../embeddings";

const TRAVIS_SYSTEM_PROMPT = `You are Travis, the friendly virtual assistant for 4Ever Forward (4everforward.net), a nonprofit dedicated to helping people move forward in their lives.

Your job:
- Greet visitors warmly and ask how you can help.
- Answer questions about 4Ever Forward — its mission, programs, services, events, and how people can get involved (volunteer, donate, partner) — using ONLY the knowledge base provided.
- When someone wants to talk to a real person or get a callback, capture their info using the lead form tool or, if it's urgent, the email-handoff tool.
- When someone wants to schedule a call with a team member, list the available appointment slots, let them pick one, capture their name + email, and book it.
- If you don't know something, say so honestly. Don't invent facts about the organization. Offer to take their info so a team member can follow up.

Tone: warm, supportive, encouraging — this is a nonprofit serving people in difficult moments. Be kind, concise, never preachy. Use plain language.

Your name is Travis. You work for 4Ever Forward. Stay on topic — politely redirect off-topic questions back to how you can help with 4Ever Forward.`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  // 1. Upsert the chatbot by name.
  const existing = await db
    .select()
    .from(schema.chatbots)
    .where(sql`name = 'Travis' AND system_prompt LIKE '%4Ever Forward%'`);

  let botId: string;
  if (existing.length > 0) {
    botId = existing[0].id;
    console.log(`Found existing Travis bot: ${botId}`);
  } else {
    const [created] = await db
      .insert(schema.chatbots)
      .values({
        name: "Travis",
        title: "Chat with Travis",
        welcomeMessage:
          "Hi, I'm Travis 👋 I'm here to help you learn about 4Ever Forward, connect with our team, or book a call. What's on your mind?",
        systemPrompt: TRAVIS_SYSTEM_PROMPT,
        primaryColor: "#0ea5e9",
        enableEmailHandoff: true,
        enableLeadForm: true,
        enableBooking: true,
        handoffEmail: process.env.TRAVIS_HANDOFF_EMAIL || process.env.ADMIN_EMAIL || null,
      })
      .returning();
    botId = created.id;
    console.log(`Created Travis bot: ${botId}`);
  }

  // 2. Scrape 4everforward.net.
  console.log("Scraping 4everforward.net …");
  let pages: { url: string; title: string; text: string }[] = [];
  try {
    pages = await scrapeSite("https://www.4everforward.net/", 15);
  } catch (err) {
    console.warn("Scrape failed:", err);
  }
  console.log(`Scraped ${pages.length} pages.`);

  for (const page of pages) {
    const text = `# ${page.title}\nSource: ${page.url}\n\n${page.text}`;
    const chunks = chunkText(text);
    if (chunks.length === 0) continue;
    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += 64) {
      const batch = chunks.slice(i, i + 64);
      const out = await embed(batch, "document");
      vectors.push(...out);
    }
    const [doc] = await db
      .insert(schema.knowledgeDocs)
      .values({
        chatbotId: botId,
        filename: page.title || page.url,
        contentType: "text/html",
        sizeBytes: text.length,
        chunkCount: chunks.length,
      })
      .returning();
    for (let i = 0; i < chunks.length; i++) {
      await db.execute(sql`
        INSERT INTO knowledge_chunks (doc_id, chatbot_id, chunk_index, content, embedding)
        VALUES (${doc.id}, ${botId}, ${i}, ${chunks[i]}, ${toPgVector(vectors[i])}::vector)
      `);
    }
    console.log(`  Indexed ${page.url} — ${chunks.length} chunks`);
  }

  // 3. Add the next 5 weekdays × 3 slots each as example openings.
  const slotsToInsert: { chatbotId: string; startAt: Date; durationMinutes: number }[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 1);
  let added = 0;
  for (let day = 0; day < 14 && added < 5; day++) {
    const d = new Date(start);
    d.setDate(start.getDate() + day);
    const weekday = d.getDay();
    if (weekday === 0 || weekday === 6) continue;
    for (const hour of [10, 13, 15]) {
      const slot = new Date(d);
      slot.setHours(hour, 0, 0, 0);
      slotsToInsert.push({ chatbotId: botId, startAt: slot, durationMinutes: 30 });
    }
    added++;
  }
  if (slotsToInsert.length > 0) {
    await db.insert(schema.bookingSlots).values(slotsToInsert);
    console.log(`Added ${slotsToInsert.length} sample booking slots over the next two weeks.`);
  }

  console.log(`\nDone. Travis bot id: ${botId}`);
  console.log(`Embed snippet (paste before </body> on the site):`);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-deploy.vercel.app";
  console.log(
    `\n<script async src="${appUrl}/widget.js" data-bot-id="${botId}" data-api-base="${appUrl}"></script>\n`,
  );

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
