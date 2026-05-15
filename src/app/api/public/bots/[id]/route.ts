import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatbots } from "@/lib/db/schema";

// Public widget bootstrap — returns only the fields needed to render the chat UI.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [bot] = await db.select().from(chatbots).where(eq(chatbots.id, params.id));
  if (!bot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: bot.id,
    name: bot.name,
    title: bot.title,
    welcomeMessage: bot.welcomeMessage,
    logoUrl: bot.logoUrl,
    primaryColor: bot.primaryColor,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
