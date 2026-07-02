import pg from "pg";
import { normalizeDatabaseUrl } from "~/server/utils/database-url";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  const databaseUrl = useRuntimeConfig().databaseUrl;
  if (!databaseUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: "DATABASE_URL is not configured.",
    });
  }

  pool ??= new pg.Pool({
    connectionString: normalizeDatabaseUrl(databaseUrl),
    ssl: { rejectUnauthorized: true },
  });
  return pool;
}

export function toIsoDate(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
