import { NextRequest, NextResponse } from "next/server";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const convId = url.searchParams.get("conversationId");

  if (convId) {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId));
    if (!conv || conv.chatbotId !== params.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));
    return NextResponse.json({ conversation: conv, messages: msgs });
  }

  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.chatbotId, params.id))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(100);
  return NextResponse.json(rows);
}
