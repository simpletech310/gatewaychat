import postgres from "postgres";
import bcrypt from "bcryptjs";
import {
  SCHEMA_SQL,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
} from "./db/schema-sql";
import { ensureBucket, isSupabaseConfigured, LOGOS_BUCKET } from "./storage";

// Idempotent first-run setup: creates the schema and the default admin user
// if one doesn't exist. Cached for the lifetime of the serverless instance,
// so each cold start runs it at most once.
let bootstrapPromise: Promise<void> | null = null;

export function ensureBootstrapped(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  const promise = (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");

    const sql = postgres(url, { max: 1, prepare: false });
    try {
      await sql.unsafe(SCHEMA_SQL);

      const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL)
        .trim()
        .toLowerCase();
      const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
      const hash = await bcrypt.hash(password, 10);

      // INSERT-only: never silently rotate an existing admin's password on boot.
      await sql`
        INSERT INTO admin_users (email, password_hash)
        VALUES (${email}, ${hash})
        ON CONFLICT (email) DO NOTHING
      `;
    } finally {
      await sql.end();
    }

    // Provision Supabase storage buckets if Supabase is configured.
    // Skipped silently if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't set,
    // so the app still works against any plain Postgres.
    if (isSupabaseConfigured()) {
      try {
        await ensureBucket(LOGOS_BUCKET, true);
      } catch (err) {
        // Non-fatal — logo uploads will surface a clearer error if the bucket is missing.
        console.warn("Supabase bucket provisioning failed:", err);
      }
    }
  })();

  // Allow retry on failure (e.g. transient connection error).
  bootstrapPromise = promise.catch((err) => {
    bootstrapPromise = null;
    throw err;
  });

  return bootstrapPromise;
}
