import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { knowledgeDocs } from "@/lib/db/schema";
import { scrapeSite, scrapeUrl } from "@/lib/scraper";
import { chunkText } from "@/lib/chunking";
import { embed, toPgVector } from "@/lib/embeddings";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  url: z.string().url(),
  mode: z.enum(["single", "crawl"]).default("crawl"),
  maxPages: z.number().int().min(1).max(30).default(12),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const pages =
      parsed.data.mode === "single"
        ? [await scrapeUrl(parsed.data.url)]
        : await scrapeSite(parsed.data.url, parsed.data.maxPages);

    if (pages.length === 0) {
      return NextResponse.json({ error: "No pages could be scraped." }, { status: 400 });
    }

    let totalChunks = 0;
    const docs: { url: string; title: string; chunks: number }[] = [];

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
        .insert(knowledgeDocs)
        .values({
          chatbotId: params.id,
          filename: page.title || page.url,
          contentType: "text/html",
          sizeBytes: text.length,
          chunkCount: chunks.length,
        })
        .returning();

      for (let i = 0; i < chunks.length; i++) {
        await db.execute(sql`
          INSERT INTO knowledge_chunks (doc_id, chatbot_id, chunk_index, content, embedding)
          VALUES (${doc.id}, ${params.id}, ${i}, ${chunks[i]}, ${toPgVector(vectors[i])}::vector)
        `);
      }

      totalChunks += chunks.length;
      docs.push({ url: page.url, title: page.title, chunks: chunks.length });
    }

    return NextResponse.json({ pages: docs.length, totalChunks, docs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
