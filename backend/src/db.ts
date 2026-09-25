import { readFile } from "node:fs/promises";
import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function initDatabase(): Promise<void> {
  const schemaPath = new URL("../database.sql", import.meta.url);
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);
}
