import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookingSlots } from "@/lib/db/schema";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const now = new Date();
  const rows = await db
    .select()
    .from(bookingSlots)
    .where(and(eq(bookingSlots.chatbotId, params.id), gte(bookingSlots.startAt, now)))
    .orderBy(asc(bookingSlots.startAt));
  return NextResponse.json(rows);
}

const createSchema = z.object({
  slots: z
    .array(
      z.object({
        startAt: z.string().datetime(),
        durationMinutes: z.number().int().min(5).max(480).default(30),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const rows = await db
    .insert(bookingSlots)
    .values(
      parsed.data.slots.map((s) => ({
        chatbotId: params.id,
        startAt: new Date(s.startAt),
        durationMinutes: s.durationMinutes,
      })),
    )
    .returning();
  return NextResponse.json(rows, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const slotId = url.searchParams.get("slotId");
  if (!slotId) return NextResponse.json({ error: "slotId required" }, { status: 400 });
  await db
    .delete(bookingSlots)
    .where(and(eq(bookingSlots.id, slotId), eq(bookingSlots.chatbotId, params.id)));
  return NextResponse.json({ ok: true });
}
