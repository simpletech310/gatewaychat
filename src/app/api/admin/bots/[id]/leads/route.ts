import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.chatbotId, params.id))
    .orderBy(desc(leads.createdAt))
    .limit(200);
  return NextResponse.json(rows);
}
