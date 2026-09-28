import { readFile } from "node:fs/promises";
import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

// Cria as tabelas que faltarem (database.sql usa IF NOT EXISTS, por isso pode correr sempre)
export async function initDatabase() {
  const schema = await readFile(new URL("../database.sql", import.meta.url), "utf8");
  await pool.query(schema);
}

// Corre várias queries numa transação: ou correm todas, ou nenhuma
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
