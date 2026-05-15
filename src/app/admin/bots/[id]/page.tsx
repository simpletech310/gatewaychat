import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatbots } from "@/lib/db/schema";
import BotEditor from "./BotEditor";

export const dynamic = "force-dynamic";

export default async function BotPage({ params }: { params: { id: string } }) {
  const [bot] = await db.select().from(chatbots).where(eq(chatbots.id, params.id));
  if (!bot) notFound();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return <BotEditor bot={bot} appUrl={appUrl} />;
}
