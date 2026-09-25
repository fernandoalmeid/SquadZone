import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server, type Socket } from "socket.io";
import { config } from "../config.js";
import { pool } from "../db.js";
import type { TokenPayload } from "../middleware/auth.js";
import { getChannelAccess, getMemberContext } from "../services/permissions.js";

interface VoiceParticipant {
  socketId: string;
  userId: number;
  username: string;
  muted: boolean;
  deafened: boolean;
  screenStreamId: string | null;
}

interface VoiceChannelState {
  serverId: number;
  participants: Map<string, VoiceParticipant>;
}

type Ack = (response: unknown) => void;

let io: Server | null = null;

const userSockets = new Map<number, Set<string>>();
const socketUsers = new Map<string, { userId: number; username: string }>();
const socketChannel = new Map<string, { channelId: number; serverId: number }>();
const voiceChannels = new Map<number, VoiceChannelState>();
const socketVoice = new Map<string, number>();

function reply(ack: unknown, response: unknown) {
  if (typeof ack === "function") {
    (ack as Ack)(response);
  }
}

function toPositiveInt(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function isOnline(userId: number): boolean {
  return (userSockets.get(userId)?.size ?? 0) > 0;
}

export function emitToUser(userId: number, event: string, payload?: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToServer(serverId: number, event: string, payload?: unknown) {
  io?.to(`server:${serverId}`).emit(event, payload);
}

export function emitServerUpdate(serverId: number) {
  emitToServer(serverId, "server:update", { serverId });
}

export function emitToChannel(channelId: number, event: string, payload?: unknown) {
  io?.to(`channel:${channelId}`).emit(event, payload);
}

export function addUserToServerRoom(userId: number, serverId: number) {
  io?.in(`user:${userId}`).socketsJoin(`server:${serverId}`);
}

function unsubscribeChannel(socketId: string) {
  const subscription = socketChannel.get(socketId);
  if (!subscription) {
    return;
  }
  io?.sockets.sockets.get(socketId)?.leave(`channel:${subscription.channelId}`);
  socketChannel.delete(socketId);
}

function participantsOf(channelId: number): VoiceParticipant[] {
  return [...(voiceChannels.get(channelId)?.participants.values() ?? [])];
}

function voiceStateFor(serverId: number): Record<number, VoiceParticipant[]> {
  const state: Record<number, VoiceParticipant[]> = {};
  for (const [channelId, channel] of voiceChannels) {
    if (channel.serverId === serverId && channel.participants.size > 0) {
      state[channelId] = [...channel.participants.values()];
    }
  }
  return state;
}

function emitVoiceChange(channelId: number, serverId: number) {
  io?.to(`voice:${channelId}`).emit("voice:participants", {
    channelId,
    participants: participantsOf(channelId),
  });
  emitToServer(serverId, "voice:state", { serverId, channels: voiceStateFor(serverId) });
}

function leaveVoice(socketId: string) {
  const channelId = socketVoice.get(socketId);
  if (channelId === undefined) {
    return;
  }

  socketVoice.delete(socketId);
  const channel = voiceChannels.get(channelId);
  if (!channel) {
    return;
  }

  channel.participants.delete(socketId);
  io?.sockets.sockets.get(socketId)?.leave(`voice:${channelId}`);
  io?.to(`voice:${channelId}`).emit("voice:peer-left", { socketId });

  if (channel.participants.size === 0) {
    voiceChannels.delete(channelId);
  }

  emitVoiceChange(channelId, channel.serverId);
}

function kickFromVoice(socketId: string) {
  leaveVoice(socketId);
  io?.to(socketId).emit("voice:kicked");
}

export function removeUserFromServer(userId: number, serverId: number) {
  io?.in(`user:${userId}`).socketsLeave(`server:${serverId}`);

  for (const socketId of userSockets.get(userId) ?? []) {
    if (socketChannel.get(socketId)?.serverId === serverId) {
      unsubscribeChannel(socketId);
    }
    const voiceChannelId = socketVoice.get(socketId);
    if (voiceChannelId !== undefined && voiceChannels.get(voiceChannelId)?.serverId === serverId) {
      kickFromVoice(socketId);
    }
  }
}

export async function revalidateServerAccess(serverId: number) {
  const subscriptions = [...socketChannel.entries()].filter(([, sub]) => sub.serverId === serverId);

  for (const [socketId, subscription] of subscriptions) {
    const user = socketUsers.get(socketId);
    const access = user ? await getChannelAccess(subscription.channelId, user.userId) : null;
    if (!access) {
      unsubscribeChannel(socketId);
    }
  }

  const voiceEntries = [...voiceChannels.entries()].filter(([, channel]) => channel.serverId === serverId);

  for (const [channelId, channel] of voiceEntries) {
    for (const participant of [...channel.participants.values()]) {
      const access = await getChannelAccess(channelId, participant.userId);
      if (!access || access.channel.type !== "voice") {
        kickFromVoice(participant.socketId);
      }
    }
  }
}

async function relevantUserIds(userId: number): Promise<number[]> {
  const result = await pool.query<{ id: number }>(
    `SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS id
     FROM friendships
     WHERE status = 'accepted' AND (requester_id = $1 OR addressee_id = $1)
     UNION
     SELECT m2.user_id AS id FROM server_members m1
     JOIN server_members m2 ON m2.server_id = m1.server_id
     WHERE m1.user_id = $1 AND m2.user_id <> $1`,
    [userId],
  );
  return result.rows.map((row) => row.id);
}

async function broadcastPresence(userId: number, online: boolean) {
  const ids = await relevantUserIds(userId);
  for (const id of ids) {
    emitToUser(id, "presence:update", { userId, online });
  }
}

async function handleConnection(socket: Socket) {
  const user = socket.data as { userId: number; username: string };
  const { userId, username } = user;

  socketUsers.set(socket.id, { userId, username });
  const sockets = userSockets.get(userId) ?? new Set<string>();
  sockets.add(socket.id);
  userSockets.set(userId, sockets);

  socket.join(`user:${userId}`);

  const memberships = await pool.query<{ server_id: number }>(
    "SELECT server_id FROM server_members WHERE user_id = $1",
    [userId],
  );
  for (const row of memberships.rows) {
    socket.join(`server:${row.server_id}`);
  }

  if (sockets.size === 1) {
    await broadcastPresence(userId, true);
  }

  socket.on("presence:sync", async (_payload: unknown, ack: unknown) => {
    try {
      const ids = await relevantUserIds(userId);
      reply(ack, { online: [userId, ...ids.filter(isOnline)] });
    } catch {
      reply(ack, { online: [userId] });
    }
  });

  socket.on("channel:subscribe", async (payload: { channelId?: unknown }, ack: unknown) => {
    try {
      const channelId = toPositiveInt(payload?.channelId);
      const access = channelId ? await getChannelAccess(channelId, userId) : null;
      if (!access || access.channel.type !== "text") {
        reply(ack, { ok: false });
        return;
      }
      unsubscribeChannel(socket.id);
      socket.join(`channel:${access.channel.id}`);
      socketChannel.set(socket.id, { channelId: access.channel.id, serverId: access.channel.server_id });
      reply(ack, { ok: true });
    } catch {
      reply(ack, { ok: false });
    }
  });

  socket.on("channel:unsubscribe", () => {
    unsubscribeChannel(socket.id);
  });

  socket.on("voice:join", async (payload: { channelId?: unknown }, ack: unknown) => {
    try {
      const channelId = toPositiveInt(payload?.channelId);
      const access = channelId ? await getChannelAccess(channelId, userId) : null;
      if (!access || access.channel.type !== "voice") {
        reply(ack, { ok: false, error: "You can't join this voice channel" });
        return;
      }

      leaveVoice(socket.id);

      const id = access.channel.id;
      const channel = voiceChannels.get(id) ?? {
        serverId: access.channel.server_id,
        participants: new Map<string, VoiceParticipant>(),
      };
      voiceChannels.set(id, channel);

      const peers = [...channel.participants.keys()];
      channel.participants.set(socket.id, {
        socketId: socket.id,
        userId,
        username,
        muted: false,
        deafened: false,
        screenStreamId: null,
      });
      socketVoice.set(socket.id, id);
      socket.join(`voice:${id}`);

      reply(ack, { ok: true, peers, participants: participantsOf(id) });
      socket.to(`voice:${id}`).emit("voice:peer-joined", { socketId: socket.id });
      emitVoiceChange(id, channel.serverId);
    } catch {
      reply(ack, { ok: false, error: "Couldn't join the voice channel" });
    }
  });

  socket.on("voice:leave", () => {
    leaveVoice(socket.id);
  });

  socket.on(
    "voice:update",
    (payload: { muted?: unknown; deafened?: unknown; screenStreamId?: unknown }) => {
      const channelId = socketVoice.get(socket.id);
      const channel = channelId !== undefined ? voiceChannels.get(channelId) : undefined;
      const participant = channel?.participants.get(socket.id);
      if (!channel || !participant || channelId === undefined) {
        return;
      }

      if (typeof payload?.muted === "boolean") participant.muted = payload.muted;
      if (typeof payload?.deafened === "boolean") participant.deafened = payload.deafened;
      if (payload?.screenStreamId === null) participant.screenStreamId = null;
      if (typeof payload?.screenStreamId === "string") {
        participant.screenStreamId = payload.screenStreamId.slice(0, 100);
      }

      emitVoiceChange(channelId, channel.serverId);
    },
  );

  socket.on("voice:signal", (payload: { to?: unknown; data?: unknown }) => {
    const to = typeof payload?.to === "string" ? payload.to : null;
    const channelId = socketVoice.get(socket.id);
    if (!to || channelId === undefined || socketVoice.get(to) !== channelId) {
      return;
    }
    io?.to(to).emit("voice:signal", { from: socket.id, data: payload.data });
  });

  socket.on("voice:state:get", async (payload: { serverId?: unknown }, ack: unknown) => {
    try {
      const serverId = toPositiveInt(payload?.serverId);
      const context = serverId ? await getMemberContext(serverId, userId) : null;
      reply(ack, context && serverId ? voiceStateFor(serverId) : {});
    } catch {
      reply(ack, {});
    }
  });

  socket.on("disconnect", async () => {
    leaveVoice(socket.id);
    unsubscribeChannel(socket.id);
    socketUsers.delete(socket.id);

    const remaining = userSockets.get(userId);
    remaining?.delete(socket.id);

    if (!remaining || remaining.size === 0) {
      userSockets.delete(userId);
      try {
        await broadcastPresence(userId, false);
      } catch (err) {
        console.error(err);
      }
    }
  });
}

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientUrl },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string") {
        next(new Error("Not authenticated"));
        return;
      }

      const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
      const result = await pool.query<{ id: number; username: string }>(
        "SELECT id, username FROM users WHERE id = $1",
        [payload.userId],
      );
      const user = result.rows[0];

      if (!user) {
        next(new Error("Not authenticated"));
        return;
      }

      socket.data = { userId: user.id, username: user.username };
      next();
    } catch {
      next(new Error("Not authenticated"));
    }
  });

  io.on("connection", (socket) => {
    handleConnection(socket).catch((err) => {
      console.error(err);
      socket.disconnect();
    });
  });
}
