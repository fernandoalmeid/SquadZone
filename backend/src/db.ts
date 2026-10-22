import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

mkdirSync(dirname(config.databasePath), { recursive: true });

const sqlite = new DatabaseSync(config.databasePath);
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

type SqlParams = unknown[] | undefined;

/**
 * Convert Postgres-style $1, $2 placeholders to SQLite `?`.
 * Each $N is expanded to its own `?` and the matching param is repeated,
 * so queries that reuse `$1` multiple times work correctly.
 */
function convertSql(sql: string, params?: SqlParams): { sql: string; params: unknown[] } {
  const source = params ?? [];
  const bound: unknown[] = [];
  const converted = sql.replace(/\$(\d+)/g, (_match, num: string) => {
    const index = Number(num) - 1;
    if (index < 0 || index >= source.length) {
      throw new Error(`SQL placeholder $${num} has no matching parameter (got ${source.length})`);
    }
    let value = source[index];
    if (typeof value === "boolean") value = value ? 1 : 0;
    bound.push(value);
    return "?";
  });
  return { sql: converted, params: bound };
}

function runQuery<T>(sql: string, params?: SqlParams): QueryResult<T> {
  const { sql: sqliteSql, params: bound } = convertSql(sql, params);
  const upper = sqliteSql.trim().toUpperCase();
  const returnsRows =
    upper.startsWith("SELECT") ||
    upper.startsWith("WITH") ||
    upper.startsWith("PRAGMA") ||
    /\bRETURNING\b/i.test(sqliteSql);

  const stmt = sqlite.prepare(sqliteSql);

  if (returnsRows) {
    const rows = stmt.all(...bound) as T[];
    return { rows, rowCount: rows.length };
  }

  const info = stmt.run(...bound) as { changes: number };
  return { rows: [] as T[], rowCount: Number(info.changes ?? 0) };
}

/** API compatible with the old `pg` pool so routes need minimal changes. */
export const pool = {
  query<T = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<QueryResult<T>> {
    return Promise.resolve(runQuery<T>(sql, params));
  },
};

export interface TxClient {
  query<T = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<QueryResult<T>>;
}

export async function withTransaction<T>(work: (client: TxClient) => Promise<T>): Promise<T> {
  const client: TxClient = {
    query<R = Record<string, unknown>>(sql: string, params?: SqlParams) {
      return Promise.resolve(runQuery<R>(sql, params));
    },
  };

  sqlite.exec("BEGIN");
  try {
    const result = await work(client);
    sqlite.exec("COMMIT");
    return result;
  } catch (err) {
    sqlite.exec("ROLLBACK");
    throw err;
  }
}

function ensureColumn(table: string, column: string, definition: string) {
  const info = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!info.some((col) => col.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function initDatabase() {
  const schema = await readFile(new URL("../database.sql", import.meta.url), "utf8");
  sqlite.exec(schema);
  // Migrate existing databases created before profile fields existed
  ensureColumn("users", "avatar", "TEXT");
  ensureColumn("users", "banner", "TEXT");
  ensureColumn("users", "bio", "TEXT NOT NULL DEFAULT ''");
}
