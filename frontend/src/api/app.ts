import type { FriendsData, Message, ServerDetails, ServerSummary } from "../types/app.ts";
import { apiRequest } from "./client.ts";

function json(method: string, body?: unknown): RequestInit {
  return body === undefined ? { method } : { method, body: JSON.stringify(body) };
}

export const friendsApi = {
  list: () => apiRequest<FriendsData>("/friends"),
  add: (username: string) =>
    apiRequest<{ status: "pending" | "accepted"; username: string }>(
      "/friends",
      json("POST", { username }),
    ),
  accept: (userId: number) => apiRequest(`/friends/${userId}/accept`, json("POST")),
  remove: (userId: number) => apiRequest(`/friends/${userId}`, json("DELETE")),
};

export interface CategoryInput {
  name: string;
  isPrivate: boolean;
  roleIds: number[];
}

export interface RoleInput {
  name: string;
  color: string;
  isAdmin: boolean;
}

export interface ChannelInput {
  name: string;
  type?: "text" | "voice";
  categoryId: number | null;
}

export const serversApi = {
  list: () => apiRequest<{ servers: ServerSummary[] }>("/servers"),
  create: (name: string) =>
    apiRequest<{ server: ServerSummary }>("/servers", json("POST", { name })),
  join: (inviteCode: string) =>
    apiRequest<{ server: ServerSummary }>("/servers/join", json("POST", { inviteCode })),
  get: (serverId: number) => apiRequest<ServerDetails>(`/servers/${serverId}`),
  rename: (serverId: number, name: string) =>
    apiRequest(`/servers/${serverId}`, json("PATCH", { name })),
  newInvite: (serverId: number) =>
    apiRequest<{ inviteCode: string }>(`/servers/${serverId}/invite`, json("POST")),
  remove: (serverId: number) => apiRequest(`/servers/${serverId}`, json("DELETE")),
  leave: (serverId: number) => apiRequest(`/servers/${serverId}/leave`, json("POST")),
  kick: (serverId: number, userId: number) =>
    apiRequest(`/servers/${serverId}/members/${userId}`, json("DELETE")),
  setMemberRoles: (serverId: number, userId: number, roleIds: number[]) =>
    apiRequest(`/servers/${serverId}/members/${userId}/roles`, json("PUT", { roleIds })),
  createRole: (serverId: number, input: RoleInput) =>
    apiRequest(`/servers/${serverId}/roles`, json("POST", input)),
  updateRole: (serverId: number, roleId: number, input: RoleInput) =>
    apiRequest(`/servers/${serverId}/roles/${roleId}`, json("PATCH", input)),
  deleteRole: (serverId: number, roleId: number) =>
    apiRequest(`/servers/${serverId}/roles/${roleId}`, json("DELETE")),
  createCategory: (serverId: number, input: CategoryInput) =>
    apiRequest(`/servers/${serverId}/categories`, json("POST", input)),
  updateCategory: (serverId: number, categoryId: number, input: CategoryInput) =>
    apiRequest(`/servers/${serverId}/categories/${categoryId}`, json("PATCH", input)),
  deleteCategory: (serverId: number, categoryId: number) =>
    apiRequest(`/servers/${serverId}/categories/${categoryId}`, json("DELETE")),
  createChannel: (serverId: number, input: ChannelInput) =>
    apiRequest<{ id: number }>(`/servers/${serverId}/channels`, json("POST", input)),
  updateChannel: (serverId: number, channelId: number, input: ChannelInput) =>
    apiRequest(`/servers/${serverId}/channels/${channelId}`, json("PATCH", input)),
  deleteChannel: (serverId: number, channelId: number) =>
    apiRequest(`/servers/${serverId}/channels/${channelId}`, json("DELETE")),
};

export const messagesApi = {
  list: (channelId: number) =>
    apiRequest<{ messages: Message[] }>(`/channels/${channelId}/messages`),
  send: (channelId: number, content: string) =>
    apiRequest<{ message: Message }>(
      `/channels/${channelId}/messages`,
      json("POST", { content }),
    ),
};
