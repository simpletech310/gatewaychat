import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy connection: a missing DATABASE_URL must not crash module evaluation
// (which happens during Next.js build). It throws only when something actually
// tries to hit the DB at runtime.
type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;
type PgClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  __pg?: PgClient;
  __db?: DrizzleClient;
};

function initClient(): { pg: PgClient; db: DrizzleClient } {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pg = globalForDb.__pg ?? postgres(url, { max: 5, prepare: false });
  const db = globalForDb.__db ?? drizzle(pg, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__pg = pg;
    globalForDb.__db = db;
  }
  return { pg, db };
}

export const db = new Proxy({} as DrizzleClient, {
  get(_target, prop, receiver) {
    const { db: real } = initClient();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
