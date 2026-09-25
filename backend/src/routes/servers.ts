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
  const result = await pool.query<{ id: number }>(
    "SELECT id FROM roles WHERE server_id = $1 AND id = ANY($2::int[])",
    [serverId, roleIds],
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

serversRouter.post("/", async (req, res) => {
  const userId: number = res.locals.userId;
  const name = requireText(req.body?.name, "Server name", 100);

  const server = await withTransaction(async (client) => {
    const created = await client.query<{ id: number; name: string; owner_id: number }>(
      "INSERT INTO servers (name, owner_id, invite_code) VALUES ($1, $2, $3) RETURNING id, name, owner_id",
      [name, userId, newInviteCode()],
    );
    const row = created.rows[0]!;

    await client.query("INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)", [
      row.id,
      userId,
    ]);

    const text = await client.query<{ id: number }>(
      "INSERT INTO categories (server_id, name, position) VALUES ($1, 'Text channels', 0) RETURNING id",
      [row.id],
    );
    const voice = await client.query<{ id: number }>(
      "INSERT INTO categories (server_id, name, position) VALUES ($1, 'Voice channels', 1) RETURNING id",
      [row.id],
    );

    await client.query(
      `INSERT INTO channels (server_id, category_id, name, type, position)
       VALUES ($1, $2, 'general', 'text', 0), ($1, $3, 'General', 'voice', 1)`,
      [row.id, text.rows[0]!.id, voice.rows[0]!.id],
    );

    return row;
  });

  addUserToServerRoom(userId, server.id);
  emitToUser(userId, "servers:update");
  res.status(201).json({ server: { id: server.id, name: server.name, ownerId: server.owner_id } });
});

serversRouter.post("/join", async (req, res) => {
  const userId: number = res.locals.userId;
  const code = requireText(req.body?.inviteCode, "Invite code", 100)
    .split("/")
    .pop()!
    .trim();

  const result = await pool.query<{ id: number; name: string; owner_id: number }>(
    "SELECT id, name, owner_id FROM servers WHERE invite_code = $1",
    [code],
  );
  const server = result.rows[0];

  if (!server) {
    throw new HttpError(404, "That invite code is invalid");
  }

  const inserted = await pool.query(
    "INSERT INTO server_members (server_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [server.id, userId],
  );

  if (inserted.rowCount) {
    addUserToServerRoom(userId, server.id);
    emitToUser(userId, "servers:update");
    emitServerUpdate(server.id);
  }

  res.json({ server: { id: server.id, name: server.name, ownerId: server.owner_id } });
});

serversRouter.get("/:serverId", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const context = await requireMember(serverId, res.locals.userId);

  const [serverResult, rolesResult, membersResult, categories, channels] = await Promise.all([
    pool.query<{ id: number; name: string; owner_id: number; invite_code: string }>(
      "SELECT id, name, owner_id, invite_code FROM servers WHERE id = $1",
      [serverId],
    ),
    pool.query<{ id: number; name: string; color: string; is_admin: boolean }>(
      "SELECT id, name, color, is_admin FROM roles WHERE server_id = $1 ORDER BY id",
      [serverId],
    ),
    pool.query<{ id: number; username: string; role_ids: number[] }>(
      `SELECT u.id, u.username,
              COALESCE(array_agg(r.id ORDER BY r.id) FILTER (WHERE r.id IS NOT NULL), '{}') AS role_ids
       FROM server_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN member_roles mr ON mr.user_id = u.id
       LEFT JOIN roles r ON r.id = mr.role_id AND r.server_id = m.server_id
       WHERE m.server_id = $1
       GROUP BY u.id
       ORDER BY LOWER(u.username)`,
      [serverId],
    ),
    loadCategories(serverId),
    loadChannels(serverId),
  ]);

  const server = serverResult.rows[0]!;
  const visibleCategories = categories.filter((category) => canSeeCategory(context, category));
  const visibleIds = new Set(visibleCategories.map((category) => category.id));

  res.json({
    server: {
      id: server.id,
      name: server.name,
      ownerId: server.owner_id,
      inviteCode: server.invite_code,
    },
    permissions: { isOwner: context.isOwner, canManage: canManage(context) },
    roles: rolesResult.rows.map((role) => ({
      id: role.id,
      name: role.name,
      color: role.color,
      isAdmin: role.is_admin,
    })),
    members: membersResult.rows.map((member) => ({
      id: member.id,
      username: member.username,
      roleIds: member.role_ids,
      isOwner: member.id === server.owner_id,
    })),
    categories: visibleCategories.map((category) => ({
      id: category.id,
      name: category.name,
      isPrivate: category.is_private,
      roleIds: category.role_ids,
      position: category.position,
    })),
    channels: channels
      .filter((channel) => channel.category_id === null || visibleIds.has(channel.category_id))
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        categoryId: channel.category_id,
        position: channel.position,
      })),
  });
});

serversRouter.patch("/:serverId", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  await requireManager(serverId, res.locals.userId);
  const name = requireText(req.body?.name, "Server name", 100);

  await pool.query("UPDATE servers SET name = $1 WHERE id = $2", [name, serverId]);

  for (const id of await memberIds(serverId)) {
    emitToUser(id, "servers:update");
  }
  emitServerUpdate(serverId);
  res.json({ ok: true });
});

serversRouter.post("/:serverId/invite", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  await requireManager(serverId, res.locals.userId);

  const inviteCode = newInviteCode();
  await pool.query("UPDATE servers SET invite_code = $1 WHERE id = $2", [inviteCode, serverId]);

  emitServerUpdate(serverId);
  res.json({ inviteCode });
});

serversRouter.delete("/:serverId", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const context = await requireMember(serverId, res.locals.userId);

  if (!context.isOwner) {
    throw new HttpError(403, "Only the owner can delete the server");
  }

  const members = await memberIds(serverId);
  for (const id of members) {
    removeUserFromServer(id, serverId);
  }

  await pool.query("DELETE FROM servers WHERE id = $1", [serverId]);

  for (const id of members) {
    emitToUser(id, "servers:update");
    emitToUser(id, "server:update", { serverId });
  }
  res.status(204).end();
});

async function removeMember(serverId: number, userId: number) {
  await withTransaction(async (client) => {
    await client.query(
      "DELETE FROM member_roles WHERE user_id = $1 AND role_id IN (SELECT id FROM roles WHERE server_id = $2)",
      [userId, serverId],
    );
    await client.query("DELETE FROM server_members WHERE server_id = $1 AND user_id = $2", [
      serverId,
      userId,
    ]);
  });

  removeUserFromServer(userId, serverId);
  emitToUser(userId, "servers:update");
  emitToUser(userId, "server:update", { serverId });
  emitServerUpdate(serverId);
}

serversRouter.post("/:serverId/leave", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const context = await requireMember(serverId, res.locals.userId);

  if (context.isOwner) {
    throw new HttpError(400, "The owner can't leave the server. Delete it instead.");
  }

  await removeMember(serverId, res.locals.userId);
  res.status(204).end();
});

serversRouter.delete("/:serverId/members/:userId", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const targetId = parseId(req.params.userId);
  const context = await requireManager(serverId, res.locals.userId);

  if (targetId === context.userId) {
    throw new HttpError(400, "Use leave server instead");
  }

  const target = await requireMember(serverId, targetId).catch(() => {
    throw new HttpError(404, "Member not found");
  });

  if (target.isOwner) {
    throw new HttpError(403, "You can't kick the owner");
  }
  if (target.isAdmin && !context.isOwner) {
    throw new HttpError(403, "Only the owner can kick admins");
  }

  await removeMember(serverId, targetId);
  res.status(204).end();
});

serversRouter.put("/:serverId/members/:userId/roles", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const targetId = parseId(req.params.userId);
  const context = await requireManager(serverId, res.locals.userId);
  const roleIds = await validRoleIds(serverId, parseIdList(req.body?.roleIds));

  await requireMember(serverId, targetId).catch(() => {
    throw new HttpError(404, "Member not found");
  });

  const current = await pool.query<{ id: number; is_admin: boolean }>(
    `SELECT r.id, r.is_admin FROM member_roles mr JOIN roles r ON r.id = mr.role_id
     WHERE r.server_id = $1 AND mr.user_id = $2`,
    [serverId, targetId],
  );

  if (!context.isOwner) {
    const adminRoles = await pool.query<{ id: number }>(
      "SELECT id FROM roles WHERE server_id = $1 AND is_admin",
      [serverId],
    );
    const adminIds = new Set(adminRoles.rows.map((row) => row.id));
    const currentIds = new Set(current.rows.map((row) => row.id));
    const changesAdmin = [...adminIds].some(
      (id) => currentIds.has(id) !== roleIds.includes(id),
    );
    if (changesAdmin) {
      throw new HttpError(403, "Only the owner can give or remove admin roles");
    }
  }

  await withTransaction(async (client) => {
    await client.query(
      "DELETE FROM member_roles WHERE user_id = $1 AND role_id IN (SELECT id FROM roles WHERE server_id = $2)",
      [targetId, serverId],
    );
    for (const roleId of roleIds) {
      await client.query("INSERT INTO member_roles (role_id, user_id) VALUES ($1, $2)", [
        roleId,
        targetId,
      ]);
    }
  });

  await structureChanged(serverId);
  res.json({ ok: true });
});

serversRouter.post("/:serverId/roles", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const context = await requireManager(serverId, res.locals.userId);
  const name = requireText(req.body?.name, "Role name", 50);
  const color = parseColor(req.body?.color);
  const isAdmin = parseBoolean(req.body?.isAdmin, false);

  if (isAdmin && !context.isOwner) {
    throw new HttpError(403, "Only the owner can create admin roles");
  }

  const result = await pool.query<{ id: number }>(
    "INSERT INTO roles (server_id, name, color, is_admin) VALUES ($1, $2, $3, $4) RETURNING id",
    [serverId, name, color, isAdmin],
  );

  emitServerUpdate(serverId);
  res.status(201).json({ id: result.rows[0]!.id });
});

async function requireRole(serverId: number, roleId: number) {
  const result = await pool.query<{ id: number; is_admin: boolean }>(
    "SELECT id, is_admin FROM roles WHERE id = $1 AND server_id = $2",
    [roleId, serverId],
  );
  const role = result.rows[0];
  if (!role) {
    throw new HttpError(404, "Role not found");
  }
  return role;
}

serversRouter.patch("/:serverId/roles/:roleId", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const roleId = parseId(req.params.roleId);
  const context = await requireManager(serverId, res.locals.userId);
  const role = await requireRole(serverId, roleId);

  const name = requireText(req.body?.name, "Role name", 50);
  const color = parseColor(req.body?.color);
  const isAdmin = parseBoolean(req.body?.isAdmin, role.is_admin);

  if (!context.isOwner && (role.is_admin || isAdmin)) {
    throw new HttpError(403, "Only the owner can edit admin roles");
  }

  await pool.query("UPDATE roles SET name = $1, color = $2, is_admin = $3 WHERE id = $4", [
    name,
    color,
    isAdmin,
    roleId,
  ]);

  await structureChanged(serverId);
  res.json({ ok: true });
});

serversRouter.delete("/:serverId/roles/:roleId", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const roleId = parseId(req.params.roleId);
  const context = await requireManager(serverId, res.locals.userId);
  const role = await requireRole(serverId, roleId);

  if (role.is_admin && !context.isOwner) {
    throw new HttpError(403, "Only the owner can delete admin roles");
  }

  await pool.query("DELETE FROM roles WHERE id = $1", [roleId]);

  await structureChanged(serverId);
  res.status(204).end();
});

async function saveCategoryRoles(categoryId: number, roleIds: number[]) {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM category_roles WHERE category_id = $1", [categoryId]);
    for (const roleId of roleIds) {
      await client.query("INSERT INTO category_roles (category_id, role_id) VALUES ($1, $2)", [
        categoryId,
        roleId,
      ]);
    }
  });
}

serversRouter.post("/:serverId/categories", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  await requireManager(serverId, res.locals.userId);
  const name = requireText(req.body?.name, "Category name", 100);
  const isPrivate = parseBoolean(req.body?.isPrivate, false);
  const roleIds = await validRoleIds(serverId, parseIdList(req.body?.roleIds));

  const result = await pool.query<{ id: number }>(
    "INSERT INTO categories (server_id, name, is_private, position) VALUES ($1, $2, $3, $4) RETURNING id",
    [serverId, name, isPrivate, await nextPosition("categories", serverId)],
  );
  const categoryId = result.rows[0]!.id;
  await saveCategoryRoles(categoryId, isPrivate ? roleIds : []);

  await structureChanged(serverId);
  res.status(201).json({ id: categoryId });
});

async function requireCategory(serverId: number, categoryId: number) {
  const result = await pool.query("SELECT id FROM categories WHERE id = $1 AND server_id = $2", [
    categoryId,
    serverId,
  ]);
  if (!result.rowCount) {
    throw new HttpError(404, "Category not found");
  }
}

serversRouter.patch("/:serverId/categories/:categoryId", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const categoryId = parseId(req.params.categoryId);
  await requireManager(serverId, res.locals.userId);
  await requireCategory(serverId, categoryId);

  const name = requireText(req.body?.name, "Category name", 100);
  const isPrivate = parseBoolean(req.body?.isPrivate, false);
  const roleIds = await validRoleIds(serverId, parseIdList(req.body?.roleIds));

  await pool.query("UPDATE categories SET name = $1, is_private = $2 WHERE id = $3", [
    name,
    isPrivate,
    categoryId,
  ]);
  await saveCategoryRoles(categoryId, isPrivate ? roleIds : []);

  await structureChanged(serverId);
  res.json({ ok: true });
});

serversRouter.delete("/:serverId/categories/:categoryId", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const categoryId = parseId(req.params.categoryId);
  await requireManager(serverId, res.locals.userId);
  await requireCategory(serverId, categoryId);

  await pool.query("DELETE FROM categories WHERE id = $1", [categoryId]);

  await structureChanged(serverId);
  res.status(204).end();
});

async function parseCategoryId(serverId: number, value: unknown): Promise<number | null> {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const categoryId = parseId(value);
  await requireCategory(serverId, categoryId);
  return categoryId;
}

function parseChannelName(value: unknown, type: "text" | "voice"): string {
  const name = requireText(value, "Channel name", 100);
  return type === "text" ? name.toLowerCase().replace(/\s+/g, "-") : name;
}

serversRouter.post("/:serverId/channels", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  await requireManager(serverId, res.locals.userId);

  const type = req.body?.type === "voice" ? "voice" : "text";
  const name = parseChannelName(req.body?.name, type);
  const categoryId = await parseCategoryId(serverId, req.body?.categoryId);

  const result = await pool.query<{ id: number }>(
    `INSERT INTO channels (server_id, category_id, name, type, position)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [serverId, categoryId, name, type, await nextPosition("channels", serverId)],
  );

  await structureChanged(serverId);
  res.status(201).json({ id: result.rows[0]!.id });
});

async function requireChannel(serverId: number, channelId: number) {
  const result = await pool.query<{ type: "text" | "voice" }>(
    "SELECT type FROM channels WHERE id = $1 AND server_id = $2",
    [channelId, serverId],
  );
  const channel = result.rows[0];
  if (!channel) {
    throw new HttpError(404, "Channel not found");
  }
  return channel;
}

serversRouter.patch("/:serverId/channels/:channelId", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const channelId = parseId(req.params.channelId);
  await requireManager(serverId, res.locals.userId);
  const channel = await requireChannel(serverId, channelId);

  const name = parseChannelName(req.body?.name, channel.type);
  const categoryId = await parseCategoryId(serverId, req.body?.categoryId);

  await pool.query("UPDATE channels SET name = $1, category_id = $2 WHERE id = $3", [
    name,
    categoryId,
    channelId,
  ]);

  await structureChanged(serverId);
  res.json({ ok: true });
});

serversRouter.delete("/:serverId/channels/:channelId", async (req, res) => {
  const serverId = parseId(req.params.serverId);
  const channelId = parseId(req.params.channelId);
  await requireManager(serverId, res.locals.userId);
  await requireChannel(serverId, channelId);

  await pool.query("DELETE FROM channels WHERE id = $1", [channelId]);

  await structureChanged(serverId);
  res.status(204).end();
});
