import "dotenv/config";
import postgres from "postgres";
import { SCHEMA_SQL } from "./schema-sql";

// Idempotent — safe to run repeatedly. The same SQL is also applied at runtime
// on first login (see src/lib/bootstrap.ts).
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = postgres(url, { max: 1, prepare: false });
  await sql.unsafe(SCHEMA_SQL);
  console.log("Schema applied.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
