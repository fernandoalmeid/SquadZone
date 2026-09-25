export interface BasicUser {
  id: number;
  username: string;
}

export interface FriendsData {
  friends: BasicUser[];
  incoming: BasicUser[];
  outgoing: BasicUser[];
}

export interface ServerSummary {
  id: number;
  name: string;
  ownerId: number;
}

export interface Role {
  id: number;
  name: string;
  color: string;
  isAdmin: boolean;
}

export interface Member {
  id: number;
  username: string;
  roleIds: number[];
  isOwner: boolean;
}

export interface Category {
  id: number;
  name: string;
  isPrivate: boolean;
  roleIds: number[];
  position: number;
}

export type ChannelType = "text" | "voice";

export interface Channel {
  id: number;
  name: string;
  type: ChannelType;
  categoryId: number | null;
  position: number;
}

export interface ServerDetails {
  server: {
    id: number;
    name: string;
    ownerId: number;
    inviteCode: string;
  };
  permissions: {
    isOwner: boolean;
    canManage: boolean;
  };
  roles: Role[];
  members: Member[];
  categories: Category[];
  channels: Channel[];
}

export interface Message {
  id: number;
  channelId: number;
  content: string;
  createdAt: string;
  author: BasicUser;
}

export interface VoiceParticipant {
  socketId: string;
  userId: number;
  username: string;
  muted: boolean;
  deafened: boolean;
  screenStreamId: string | null;
}

export type VoiceChannelsState = Record<number, VoiceParticipant[]>;
