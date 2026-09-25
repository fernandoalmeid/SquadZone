<<<<<<< HEAD
import { readFile } from "node:fs/promises";
import pg from "pg";
import { config } from "./config.js";
=======
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f

const { Pool } = pg;

export const pool = new Pool({
<<<<<<< HEAD
  connectionString: config.databaseUrl,
});

export async function initDatabase(): Promise<void> {
  const schemaPath = new URL("../database.sql", import.meta.url);
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);
}

export async function withTransaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
=======
  connectionString: process.env.DATABASE_URL,
});
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
