import bcrypt from "bcryptjs";
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  created_at: Date | string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/;
const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|gif|webp);base64,/i;
const IMAGE_HTTP_URL = /^https?:\/\/.+/i;
const MAX_AVATAR_CHARS = 2_500_000; // ~1.8MB binary (data URL)
const MAX_BANNER_CHARS = 5_000_000; // ~3.5MB binary (data URL)
const MAX_URL_CHARS = 2048;
const MAX_BIO = 190;

function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar ?? null,
    banner: user.banner ?? null,
    bio: user.bio ?? "",
    createdAt: user.created_at,
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalImage(
  value: unknown,
  field: string,
  maxDataChars: number,
): string | null | undefined {
  // undefined = leave unchanged; null or "" = clear; string = set
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw Object.assign(new Error(`${field} must be an image`), { status: 400 });
  }
  const trimmed = value.trim();
  if (IMAGE_HTTP_URL.test(trimmed)) {
    if (trimmed.length > MAX_URL_CHARS) {
      throw Object.assign(new Error(`${field} URL is too long`), { status: 400 });
    }
    return trimmed;
  }
  if (IMAGE_DATA_URL.test(trimmed)) {
    if (trimmed.length > maxDataChars) {
      throw Object.assign(new Error(`${field} is too large`), { status: 400 });
    }
    return trimmed;
  }
  throw Object.assign(
    new Error(`${field} must be an image file or a direct image/GIF URL`),
    { status: 400 },
  );
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
  try {
    const email = asString(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user?.password_hash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Check that the backend is running." });
  }
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

authRouter.patch("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [
      res.locals.userId,
    ]);
    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let username = user.username;
    if (req.body?.username !== undefined) {
      const next = asString(req.body.username);
      if (!USERNAME_REGEX.test(next)) {
        res.status(400).json({
          error: "Username must be 3-50 characters (letters, numbers or _)",
        });
        return;
      }
      if (next.toLowerCase() !== user.username.toLowerCase()) {
        const taken = await pool.query(
          "SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2",
          [next, user.id],
        );
        if (taken.rowCount) {
          res.status(409).json({ error: "Username is already taken" });
          return;
        }
      }
      username = next;
    }

    let bio = user.bio ?? "";
    if (req.body?.bio !== undefined) {
      const next = typeof req.body.bio === "string" ? req.body.bio.trim() : "";
      if (next.length > MAX_BIO) {
        res.status(400).json({ error: `Bio must be at most ${MAX_BIO} characters` });
        return;
      }
      bio = next;
    }

    const avatar = parseOptionalImage(req.body?.avatar, "Avatar", MAX_AVATAR_CHARS);
    const banner = parseOptionalImage(req.body?.banner, "Banner", MAX_BANNER_CHARS);

    const nextAvatar = avatar === undefined ? user.avatar : avatar;
    const nextBanner = banner === undefined ? user.banner : banner;

    const updated = await pool.query<UserRow>(
      `UPDATE users
       SET username = $1, bio = $2, avatar = $3, banner = $4
       WHERE id = $5
       RETURNING *`,
      [username, bio, nextAvatar, nextBanner, user.id],
    );

    res.json({ user: publicUser(updated.rows[0]!) });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 400) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
});
