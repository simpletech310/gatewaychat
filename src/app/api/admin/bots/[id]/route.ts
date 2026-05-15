import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatbots } from "@/lib/db/schema";

const leadFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["text", "email", "tel", "textarea"]),
  required: z.boolean(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  clientId: z.number().int().nullable().optional(),
  title: z.string().max(255).optional(),
  systemPrompt: z.string().min(1).optional(),
  welcomeMessage: z.string().optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  enableEmailHandoff: z.boolean().optional(),
  enableLeadForm: z.boolean().optional(),
  enableBooking: z.boolean().optional(),
  handoffEmail: z.string().email().nullable().optional(),
  bookingLink: z.string().url().nullable().optional(),
  leadFormFields: z.array(leadFieldSchema).optional(),
  retrievalTopK: z.number().int().min(1).max(20).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [row] = await db.select().from(chatbots).where(eq(chatbots.id, params.id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const [row] = await db
    .update(chatbots)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(chatbots.id, params.id))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.delete(chatbots).where(eq(chatbots.id, params.id));
  return NextResponse.json({ ok: true });
}
