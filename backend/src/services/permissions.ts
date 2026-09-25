import { pool } from "../db.js";
import { HttpError } from "../utils/http.js";

export interface MemberContext {
  userId: number;
  serverId: number;
  isOwner: boolean;
  isAdmin: boolean;
  roleIds: Set<number>;
}

export interface CategoryRow {
  id: number;
  name: string;
  is_private: boolean;
  position: number;
  role_ids: number[];
}

export interface ChannelRow {
  id: number;
  server_id: number;
  category_id: number | null;
  name: string;
  type: "text" | "voice";
  position: number;
}

export async function getMemberContext(
  serverId: number,
  userId: number,
): Promise<MemberContext | null> {
  const server = await pool.query<{ owner_id: number }>(
    `SELECT s.owner_id FROM servers s
     JOIN server_members m ON m.server_id = s.id AND m.user_id = $2
     WHERE s.id = $1`,
    [serverId, userId],
  );

  const row = server.rows[0];
  if (!row) {
    return null;
  }

  const roles = await pool.query<{ id: number; is_admin: boolean }>(
    `SELECT r.id, r.is_admin FROM member_roles mr
     JOIN roles r ON r.id = mr.role_id
     WHERE r.server_id = $1 AND mr.user_id = $2`,
    [serverId, userId],
  );

  return {
    userId,
    serverId,
    isOwner: row.owner_id === userId,
    isAdmin: roles.rows.some((role) => role.is_admin),
    roleIds: new Set(roles.rows.map((role) => role.id)),
  };
}

export async function requireMember(serverId: number, userId: number): Promise<MemberContext> {
  const context = await getMemberContext(serverId, userId);
  if (!context) {
    throw new HttpError(404, "Server not found");
  }
  return context;
}

export function canManage(context: MemberContext): boolean {
  return context.isOwner || context.isAdmin;
}

export async function requireManager(serverId: number, userId: number): Promise<MemberContext> {
  const context = await requireMember(serverId, userId);
  if (!canManage(context)) {
    throw new HttpError(403, "You don't have permission to manage this server");
  }
  return context;
}

export function canSeeCategory(
  context: MemberContext,
  category: Pick<CategoryRow, "is_private" | "role_ids">,
): boolean {
  return (
    canManage(context) ||
    !category.is_private ||
    category.role_ids.some((roleId) => context.roleIds.has(roleId))
  );
}

export async function loadCategories(serverId: number): Promise<CategoryRow[]> {
  const result = await pool.query<CategoryRow>(
    `SELECT c.id, c.name, c.is_private, c.position,
            COALESCE(array_agg(cr.role_id) FILTER (WHERE cr.role_id IS NOT NULL), '{}') AS role_ids
     FROM categories c
     LEFT JOIN category_roles cr ON cr.category_id = c.id
     WHERE c.server_id = $1
     GROUP BY c.id
     ORDER BY c.position, c.id`,
    [serverId],
  );
  return result.rows;
}

export async function loadChannels(serverId: number): Promise<ChannelRow[]> {
  const result = await pool.query<ChannelRow>(
    `SELECT id, server_id, category_id, name, type, position FROM channels
     WHERE server_id = $1 ORDER BY position, id`,
    [serverId],
  );
  return result.rows;
}

export async function getChannelAccess(
  channelId: number,
  userId: number,
): Promise<{ channel: ChannelRow; context: MemberContext } | null> {
  const result = await pool.query<
    ChannelRow & { is_private: boolean | null; role_ids: number[] }
  >(
    `SELECT ch.id, ch.server_id, ch.category_id, ch.name, ch.type, ch.position, c.is_private,
            COALESCE(array_agg(cr.role_id) FILTER (WHERE cr.role_id IS NOT NULL), '{}') AS role_ids
     FROM channels ch
     LEFT JOIN categories c ON c.id = ch.category_id
     LEFT JOIN category_roles cr ON cr.category_id = c.id
     WHERE ch.id = $1
     GROUP BY ch.id, c.id`,
    [channelId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const context = await getMemberContext(row.server_id, userId);
  if (!context) {
    return null;
  }

  if (row.category_id !== null && !canSeeCategory(context, { is_private: !!row.is_private, role_ids: row.role_ids })) {
    return null;
  }

  return {
    channel: {
      id: row.id,
      server_id: row.server_id,
      category_id: row.category_id,
      name: row.name,
      type: row.type,
      position: row.position,
    },
    context,
  };
}
