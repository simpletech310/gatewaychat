import "dotenv/config";
import bcrypt from "bcryptjs";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin user");
  }

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
