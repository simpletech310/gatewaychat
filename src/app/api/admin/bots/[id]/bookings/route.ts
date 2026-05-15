import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, bookingSlots } from "@/lib/db/schema";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  // Join bookings with their slot so the admin sees the time.
  const rows = await db
    .select({
      id: bookings.id,
      name: bookings.name,
      email: bookings.email,
      phone: bookings.phone,
      notes: bookings.notes,
      conversationId: bookings.conversationId,
      createdAt: bookings.createdAt,
      startAt: bookingSlots.startAt,
      durationMinutes: bookingSlots.durationMinutes,
    })
    .from(bookings)
    .innerJoin(bookingSlots, eq(bookings.slotId, bookingSlots.id))
    .where(eq(bookings.chatbotId, params.id))
    .orderBy(desc(bookingSlots.startAt));
  return NextResponse.json(rows);
}
