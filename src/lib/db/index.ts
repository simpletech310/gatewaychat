import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { __pg?: ReturnType<typeof postgres> };
const client = globalForDb.__pg ?? postgres(connectionString, { max: 5, prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.__pg = client;

export const db = drizzle(client, { schema });
export { schema };
