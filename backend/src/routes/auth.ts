import bcrypt from "bcrypt";
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: Date;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/;

function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.created_at,
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const email = asString(req.body?.email).toLowerCase();
  const username = asString(req.body?.username);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }

  if (!USERNAME_REGEX.test(username)) {
    res.status(400).json({
      error: "Username must be 3-50 characters (letters, numbers or _)",
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const existing = await pool.query<Pick<UserRow, "email" | "username">>(
    "SELECT email, username FROM users WHERE email = $1 OR LOWER(username) = LOWER($2)",
    [email, username],
  );

  if (existing.rows.some((row) => row.email === email)) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }

  if (existing.rowCount) {
    res.status(409).json({ error: "Username is already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query<UserRow>(
    "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *",
    [email, username, passwordHash],
  );

  const user = result.rows[0]!;
  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const email = asString(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const result = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (_req, res) => {
  const result = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [
    res.locals.userId,
  ]);
  const user = result.rows[0];

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: publicUser(user) });
});
