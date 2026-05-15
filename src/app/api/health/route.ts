import { NextResponse } from "next/server";
import postgres from "postgres";
import { checkConfig } from "@/lib/config";

export const runtime = "nodejs";

// Diagnostic endpoint. Reports which required env vars are missing and whether
// the DB is reachable. Safe to expose publicly — does not leak secret values.
export async function GET() {
  const cfg = checkConfig();

  const result: {
    ok: boolean;
    missing: ReturnType<typeof checkConfig>["missing"];
    optionalMissing: ReturnType<typeof checkConfig>["optionalMissing"];
    database: { configured: boolean; reachable: boolean; error?: string };
  } = {
    ok: cfg.ok,
    missing: cfg.missing,
    optionalMissing: cfg.optionalMissing,
    database: { configured: Boolean(process.env.DATABASE_URL), reachable: false },
  };

  if (process.env.DATABASE_URL) {
    let client: ReturnType<typeof postgres> | null = null;
    try {
      client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
      await client`SELECT 1`;
      result.database.reachable = true;
    } catch (err) {
      result.database.error = err instanceof Error ? err.message : String(err);
      result.ok = false;
    } finally {
      if (client) await client.end();
    }
  }

  return NextResponse.json(result);
}
