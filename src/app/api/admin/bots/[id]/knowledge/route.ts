import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { knowledgeChunks, knowledgeDocs } from "@/lib/db/schema";
import { extractText } from "@/lib/extract";
import { chunkText } from "@/lib/chunking";
import { embed, toPgVector } from "@/lib/embeddings";
import { sql } from "drizzle-orm";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB cap per file

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const docs = await db
    .select()
    .from(knowledgeDocs)
    .where(eq(knowledgeDocs.chatbotId, params.id))
    .orderBy(desc(knowledgeDocs.createdAt));
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractText(file.name, file.type, buffer);
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "No text could be extracted from this file" }, { status: 400 });
  }

  // Embed in batches of 64 to stay within API limits.
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
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      chunkCount: chunks.length,
    })
    .returning();

  // Insert chunks — use raw SQL for the vector column.
  for (let i = 0; i < chunks.length; i++) {
    await db.execute(sql`
      INSERT INTO knowledge_chunks (doc_id, chatbot_id, chunk_index, content, embedding)
      VALUES (${doc.id}, ${params.id}, ${i}, ${chunks[i]}, ${toPgVector(vectors[i])}::vector)
    `);
  }

  return NextResponse.json({ doc, chunks: chunks.length });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const docId = url.searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "docId required" }, { status: 400 });
  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.docId, docId));
  await db.delete(knowledgeDocs).where(eq(knowledgeDocs.id, docId));
  return NextResponse.json({ ok: true });
}
