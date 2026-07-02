import pg from "pg";

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
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: true },
  });
  return pool;
}

export function toIsoDate(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
