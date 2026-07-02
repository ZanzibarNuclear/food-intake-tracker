import pg from "pg";
import dotenv from "dotenv";
import { normalizeDatabaseUrl } from "./database-url.mjs";

dotenv.config();

export function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  return databaseUrl;
}

export function createPool() {
  return new pg.Pool({
    connectionString: normalizeDatabaseUrl(requireDatabaseUrl()),
    ssl: { rejectUnauthorized: true },
  });
}
