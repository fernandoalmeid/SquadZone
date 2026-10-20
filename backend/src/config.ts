import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ quiet: true });

/** Always resolve paths from the backend package root (not process.cwd()) */
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const configuredDb = process.env.DATABASE_PATH ?? "./data/squadzone.db";

export const config = {
  port: Number(process.env.PORT ?? 5000),
  /**
   * SQLite file path. Relative paths are resolved from the backend folder,
   * so login/register always hit the same database regardless of cwd.
   */
  databasePath: configuredDb.startsWith("/") || /^[A-Za-z]:[\\/]/.test(configuredDb)
    ? configuredDb
    : resolve(backendRoot, configuredDb),
  jwtSecret: required("JWT_SECRET"),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
};
