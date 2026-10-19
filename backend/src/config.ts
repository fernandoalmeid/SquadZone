import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 5000),
  /** Path to the SQLite database file */
  databasePath: resolve(process.env.DATABASE_PATH ?? "./data/squadzone.db"),
  jwtSecret: required("JWT_SECRET"),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
};
