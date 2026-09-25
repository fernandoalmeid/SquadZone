import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { emitToUser } from "../realtime/socket.js";
import { HttpError, parseId, requireText } from "../utils/http.js";

interface FriendshipRow {
  requester_id: number;
  addressee_id: number;
  status: "pending" | "accepted";
  id: number;
  username: string;
}

export const friendsRouter = Router();

friendsRouter.use(requireAuth);

function notify(...userIds: number[]) {
  for (const userId of userIds) {
    emitToUser(userId, "friends:update");
  }
}

friendsRouter.get("/", async (_req, res) => {
  const me: number = res.locals.userId;

  const result = await pool.query<FriendshipRow>(
    `SELECT f.requester_id, f.addressee_id, f.status, u.id, u.username
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
     WHERE f.requester_id = $1 OR f.addressee_id = $1
     ORDER BY LOWER(u.username)`,
    [me],
  );

  const toUser = (row: FriendshipRow) => ({ id: row.id, username: row.username });

  res.json({
    friends: result.rows.filter((row) => row.status === "accepted").map(toUser),
    incoming: result.rows
      .filter((row) => row.status === "pending" && row.addressee_id === me)
      .map(toUser),
    outgoing: result.rows
      .filter((row) => row.status === "pending" && row.requester_id === me)
      .map(toUser),
  });
});

friendsRouter.post("/", async (req, res) => {
  const me: number = res.locals.userId;
  const username = requireText(req.body?.username, "Username", 50);

  const target = await pool.query<{ id: number; username: string }>(
    "SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)",
    [username],
  );
  const user = target.rows[0];

  if (!user) {
    throw new HttpError(404, `No user found with the username "${username}"`);
  }
  if (user.id === me) {
    throw new HttpError(400, "You can't add yourself");
  }

  const existing = await pool.query<{ requester_id: number; status: string }>(
    `SELECT requester_id, status FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
    [me, user.id],
  );
  const friendship = existing.rows[0];

  if (friendship?.status === "accepted") {
    throw new HttpError(409, `You're already friends with ${user.username}`);
  }
  if (friendship && friendship.requester_id === me) {
    throw new HttpError(409, `You already sent a request to ${user.username}`);
  }

  if (friendship) {
    await pool.query(
      "UPDATE friendships SET status = 'accepted' WHERE requester_id = $1 AND addressee_id = $2",
      [user.id, me],
    );
    notify(me, user.id);
    res.json({ status: "accepted", username: user.username });
    return;
  }

  await pool.query("INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)", [
    me,
    user.id,
  ]);
  notify(me, user.id);
  res.status(201).json({ status: "pending", username: user.username });
});

friendsRouter.post("/:userId/accept", async (req, res) => {
  const me: number = res.locals.userId;
  const other = parseId(req.params.userId);

  const result = await pool.query(
    `UPDATE friendships SET status = 'accepted'
     WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'`,
    [other, me],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Friend request not found");
  }

  notify(me, other);
  res.json({ status: "accepted" });
});

friendsRouter.delete("/:userId", async (req, res) => {
  const me: number = res.locals.userId;
  const other = parseId(req.params.userId);

  await pool.query(
    `DELETE FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
    [me, other],
  );

  notify(me, other);
  res.status(204).end();
});
