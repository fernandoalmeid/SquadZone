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

/** Convert Postgres-style $1, $2 placeholders to SQLite ? placeholders. */
function toSqliteSql(sql: string): string {
  return sql.replace(/\$(\d+)/g, "?");
}

function normalizeParams(params: SqlParams): unknown[] {
  if (!params) return [];
  return params.map((value) => {
    if (typeof value === "boolean") return value ? 1 : 0;
    return value;
  });
}

function runQuery<T>(sql: string, params?: SqlParams): QueryResult<T> {
  const sqliteSql = toSqliteSql(sql);
  const bound = normalizeParams(params);
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

export async function initDatabase() {
  const schema = await readFile(new URL("../database.sql", import.meta.url), "utf8");
  sqlite.exec(schema);
}
