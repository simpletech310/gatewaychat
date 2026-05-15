import "dotenv/config";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from "./schema-sql";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

  const sql = postgres(url, { max: 1, prepare: false });
  const hash = await bcrypt.hash(password, 10);

  await sql`
    INSERT INTO admin_users (email, password_hash)
    VALUES (${email}, ${hash})
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `;

  console.log(`Admin user seeded: ${email}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
