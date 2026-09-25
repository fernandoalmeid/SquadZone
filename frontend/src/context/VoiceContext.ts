import { createContext } from "react";
import type { VoiceParticipant } from "../types/app.ts";

export interface VoiceChannelInfo {
  id: number;
  name: string;
  serverId: number;
  serverName: string;
}

export interface VoiceContextValue {
  channel: VoiceChannelInfo | null;
  participants: VoiceParticipant[];
  remoteStreams: Record<string, MediaStream[]>;
  localScreenStream: MediaStream | null;
  mySocketId: string | null;
  muted: boolean;
  deafened: boolean;
  hasMic: boolean;
  connecting: boolean;
  error: string;
  join: (channel: VoiceChannelInfo) => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
}

export const VoiceContext = createContext<VoiceContextValue | null>(null);
