import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { createSession } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { checkConfig } from "@/lib/config";

export async function POST(req: NextRequest) {
  // Surface ALL missing required env vars at once, not just the first one.
  const cfg = checkConfig();
  if (!cfg.ok) {
    return NextResponse.json(
      {
        error: "Server is not fully configured.",
        kind: "setup",
        missing: cfg.missing,
      },
      { status: 503 },
    );
  }

  // First request after deploy: create schema + default admin user if missing.
  try {
    await ensureBootstrapped();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Setup failed: ${msg}`, kind: "bootstrap" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
  const password = typeof body?.password === "string" ? body.password : null;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  await createSession({ id: user.id, email: user.email });
  return NextResponse.json({ ok: true });
}
