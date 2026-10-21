import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { emitToUser } from "../realtime/socket.js";
import { HttpError, parseId, requireText } from "../utils/http.js";

interface DmChannelRow {
  id: number;
  user_a_id: number;
  user_b_id: number;
  peer_id: number;
  username: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
}

interface DmMessageRow {
  id: number;
  channel_id: number;
  content: string;
  created_at: string | Date;
  user_id: number;
  username: string;
  avatar: string | null;
}

export const dmsRouter = Router();
dmsRouter.use(requireAuth);

function orderedPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

function toMessage(row: DmMessageRow) {
  return {
    id: row.id,
    channelId: row.channel_id,
    content: row.content,
    createdAt: row.created_at,
    author: { id: row.user_id, username: row.username, avatar: row.avatar ?? null },
  };
}

async function getOrCreateChannel(me: number, other: number) {
  const [a, b] = orderedPair(me, other);
  const existing = await pool.query<{ id: number }>(
    "SELECT id FROM dm_channels WHERE user_a_id = $1 AND user_b_id = $2",
    [a, b],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await pool.query<{ id: number }>(
    "INSERT INTO dm_channels (user_a_id, user_b_id) VALUES ($1, $2) RETURNING id",
    [a, b],
  );
  if (inserted.rows[0]) return inserted.rows[0].id;

  const again = await pool.query<{ id: number }>(
    "SELECT id FROM dm_channels WHERE user_a_id = $1 AND user_b_id = $2",
    [a, b],
  );
  if (!again.rows[0]) throw new HttpError(500, "Could not open DM");
  return again.rows[0].id;
}

async function assertDmAccess(channelId: number, me: number) {
  const result = await pool.query<{ user_a_id: number; user_b_id: number }>(
    "SELECT user_a_id, user_b_id FROM dm_channels WHERE id = $1",
    [channelId],
  );
  const row = result.rows[0];
  if (!row || (row.user_a_id !== me && row.user_b_id !== me)) {
    throw new HttpError(404, "DM not found");
  }
  return row;
}

dmsRouter.get("/", async (_req, res) => {
  const me: number = res.locals.userId;
  const result = await pool.query<DmChannelRow>(
    `SELECT c.id, c.user_a_id, c.user_b_id,
            u.id AS peer_id, u.username, u.avatar, u.banner, u.bio
     FROM dm_channels c
     JOIN users u ON u.id = CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END
     WHERE c.user_a_id = $1 OR c.user_b_id = $1
     ORDER BY c.id DESC`,
    [me],
  );

  res.json({
    channels: result.rows.map((row) => ({
      id: row.id,
      peer: {
        id: row.peer_id,
        username: row.username,
        avatar: row.avatar ?? null,
        banner: row.banner ?? null,
        bio: row.bio ?? "",
      },
    })),
  });
});

dmsRouter.post("/open", async (req, res) => {
  const me: number = res.locals.userId;
  const otherId = parseId(String(req.body?.userId ?? ""));

  if (otherId === me) throw new HttpError(400, "Cannot DM yourself");

  const friendship = await pool.query(
    `SELECT 1 FROM friendships
     WHERE status = 'accepted'
       AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
    [me, otherId],
  );
  if (!friendship.rowCount) {
    throw new HttpError(403, "You can only message friends");
  }

  const peer = await pool.query<{ id: number; username: string; avatar: string | null; banner: string | null; bio: string | null }>(
    "SELECT id, username, avatar, banner, bio FROM users WHERE id = $1",
    [otherId],
  );
  if (!peer.rows[0]) throw new HttpError(404, "User not found");

  const channelId = await getOrCreateChannel(me, otherId);
  const p = peer.rows[0];
  res.json({
    channel: {
      id: channelId,
      peer: {
        id: p.id,
        username: p.username,
        avatar: p.avatar ?? null,
        banner: p.banner ?? null,
        bio: p.bio ?? "",
      },
    },
  });
});

dmsRouter.get("/:channelId/messages", async (req, res) => {
  const me: number = res.locals.userId;
  const channelId = parseId(req.params.channelId);
  await assertDmAccess(channelId, me);

  const result = await pool.query<DmMessageRow>(
    `SELECT * FROM (
       SELECT m.id, m.channel_id, m.content, m.created_at, u.id AS user_id, u.username, u.avatar
       FROM dm_messages m JOIN users u ON u.id = m.user_id
       WHERE m.channel_id = $1
       ORDER BY m.id DESC
       LIMIT 100
     ) recent ORDER BY id ASC`,
    [channelId],
  );

  res.json({ messages: result.rows.map(toMessage) });
});

dmsRouter.post("/:channelId/messages", async (req, res) => {
  const me: number = res.locals.userId;
  const channelId = parseId(req.params.channelId);
  const channel = await assertDmAccess(channelId, me);
  const content = requireText(req.body?.content, "Message", 2000);

  const result = await pool.query<DmMessageRow>(
    `WITH inserted AS (
       INSERT INTO dm_messages (channel_id, user_id, content) VALUES ($1, $2, $3) RETURNING *
     )
     SELECT i.id, i.channel_id, i.content, i.created_at, u.id AS user_id, u.username, u.avatar
     FROM inserted i JOIN users u ON u.id = i.user_id`,
    [channelId, me, content],
  );

  const message = toMessage(result.rows[0]!);
  const peerId = channel.user_a_id === me ? channel.user_b_id : channel.user_a_id;
  emitToUser(me, "dm:message", message);
  emitToUser(peerId, "dm:message", message);
  res.status(201).json({ message });
});
