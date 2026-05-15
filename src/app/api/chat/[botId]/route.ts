import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleChat } from "@/lib/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
  visitorId: z.string().min(1).max(128),
  pageUrl: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { botId: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await handleChat({
      botId: params.botId,
      visitorId: parsed.data.visitorId,
      userMessage: parsed.data.message,
      conversationId: parsed.data.conversationId,
      pageUrl: parsed.data.pageUrl,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
