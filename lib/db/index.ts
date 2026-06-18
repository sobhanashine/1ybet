import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse connection pool in development to avoid connection exhaustion on hot-reload.
declare global {
  // eslint-disable-next-line no-var
  var postgresClient: ReturnType<typeof postgres> | undefined;
}

let client: ReturnType<typeof postgres>;

if (process.env.NODE_ENV === "production") {
  client = postgres(connectionString, { prepare: false });
} else {
  if (!global.postgresClient) {
    global.postgresClient = postgres(connectionString, { prepare: false });
  }
  client = global.postgresClient;
}

export const db = drizzle(client, { schema });
export { schema };
