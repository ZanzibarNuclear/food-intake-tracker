import fs from "node:fs/promises";
import { createPool } from "./db-helpers.mjs";

const pool = createPool();
const schema = await fs.readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

try {
  await pool.query(schema);
  console.log("App database schema is ready.");
} finally {
  await pool.end();
}
