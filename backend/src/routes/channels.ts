import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { emitToChannel } from "../realtime/socket.js";
import { getChannelAccess } from "../services/permissions.js";
import { HttpError, parseId, requireText } from "../utils/http.js";

interface MessageRow {
  id: number;
  channel_id: number;
  content: string;
  created_at: Date;
  user_id: number;
  username: string;
}

function toMessage(row: MessageRow) {
  return {
    id: row.id,
    channelId: row.channel_id,
    content: row.content,
    createdAt: row.created_at,
    author: { id: row.user_id, username: row.username },
  };
}

async function requireTextChannel(channelId: number, userId: number) {
  const access = await getChannelAccess(channelId, userId);
  if (!access) {
    throw new HttpError(404, "Channel not found");
  }
  if (access.channel.type !== "text") {
    throw new HttpError(400, "This is not a text channel");
  }
  return access;
}

export const channelsRouter = Router();

channelsRouter.use(requireAuth);

channelsRouter.get("/:channelId/messages", async (req, res) => {
  const channelId = parseId(req.params.channelId);
  await requireTextChannel(channelId, res.locals.userId);

  const result = await pool.query<MessageRow>(
    `SELECT * FROM (
       SELECT m.id, m.channel_id, m.content, m.created_at, u.id AS user_id, u.username
       FROM messages m JOIN users u ON u.id = m.user_id
       WHERE m.channel_id = $1
       ORDER BY m.id DESC
       LIMIT 100
     ) recent ORDER BY id ASC`,
    [channelId],
  );

  res.json({ messages: result.rows.map(toMessage) });
});

channelsRouter.post("/:channelId/messages", async (req, res) => {
  const channelId = parseId(req.params.channelId);
  const userId: number = res.locals.userId;
  await requireTextChannel(channelId, userId);

  const content = requireText(req.body?.content, "Message", 2000);

  const result = await pool.query<MessageRow>(
    `WITH inserted AS (
       INSERT INTO messages (channel_id, user_id, content) VALUES ($1, $2, $3) RETURNING *
     )
     SELECT i.id, i.channel_id, i.content, i.created_at, u.id AS user_id, u.username
     FROM inserted i JOIN users u ON u.id = i.user_id`,
    [channelId, userId, content],
  );

  const message = toMessage(result.rows[0]!);
  emitToChannel(channelId, "message:new", message);
  res.status(201).json({ message });
});
