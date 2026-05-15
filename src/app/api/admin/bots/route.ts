import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatbots } from "@/lib/db/schema";

export async function GET() {
  const rows = await db.select().from(chatbots).orderBy(desc(chatbots.createdAt));
  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  clientId: z.number().int().optional(),
  title: z.string().max(255).optional(),
  systemPrompt: z.string().min(1),
  welcomeMessage: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  enableEmailHandoff: z.boolean().optional(),
  enableLeadForm: z.boolean().optional(),
  enableBooking: z.boolean().optional(),
  handoffEmail: z.string().email().optional().nullable(),
  bookingLink: z.string().url().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const [row] = await db
    .insert(chatbots)
    .values({
      ...parsed.data,
      clientId: parsed.data.clientId ?? null,
      logoUrl: parsed.data.logoUrl ?? null,
      handoffEmail: parsed.data.handoffEmail ?? null,
      bookingLink: parsed.data.bookingLink ?? null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
