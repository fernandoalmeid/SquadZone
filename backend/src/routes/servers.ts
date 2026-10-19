import { randomBytes } from "node:crypto";
import { Router } from "express";
import { pool, withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import {
  addUserToServerRoom,
  emitServerUpdate,
  emitToUser,
  removeUserFromServer,
  revalidateServerAccess,
} from "../realtime/socket.js";
import {
  canManage,
  canSeeCategory,
  loadCategories,
  loadChannels,
  requireManager,
  requireMember,
} from "../services/permissions.js";
import { HttpError, parseColor, parseId, parseIdList, requireText } from "../utils/http.js";

export const serversRouter = Router();

serversRouter.use(requireAuth);

function newInviteCode(): string {
  return randomBytes(6).toString("base64url");
}

async function memberIds(serverId: number): Promise<number[]> {
  const result = await pool.query<{ user_id: number }>(
    "SELECT user_id FROM server_members WHERE server_id = $1",
    [serverId],
  );
  return result.rows.map((row) => row.user_id);
}

async function structureChanged(serverId: number) {
  emitServerUpdate(serverId);
  await revalidateServerAccess(serverId);
}

async function validRoleIds(serverId: number, roleIds: number[]): Promise<number[]> {
  if (roleIds.length === 0) {
    return [];
  }
  const placeholders = roleIds.map((_, i) => `$${i + 2}`).join(", ");
  const result = await pool.query<{ id: number }>(
    `SELECT id FROM roles WHERE server_id = $1 AND id IN (${placeholders})`,
    [serverId, ...roleIds],
  );
  if (result.rows.length !== roleIds.length) {
    throw new HttpError(400, "One or more roles don't belong to this server");
  }
  return roleIds;
}

async function nextPosition(table: "categories" | "channels", serverId: number): Promise<number> {
  const result = await pool.query<{ next: number }>(
    `SELECT COALESCE(MAX(position), -1) + 1 AS next FROM ${table} WHERE server_id = $1`,
    [serverId],
  );
  return result.rows[0]?.next ?? 0;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

serversRouter.get("/", async (_req, res) => {
  const result = await pool.query<{ id: number; name: string; owner_id: number }>(
    `SELECT s.id, s.name, s.owner_id FROM servers s
     JOIN server_members m ON m.server_id = s.id
     WHERE m.user_id = $1
     ORDER BY m.joined_at, s.id`,
    [res.locals.userId],
  );

  res.json({
    servers: result.rows.map((row) => ({ id: row.id, name: row.name, ownerId: row.owner_id })),
  });
});
