import { createContext } from "react";
import type { Socket } from "socket.io-client";
import type { VoiceChannelsState } from "../types/app.ts";

export interface SocketContextValue {
  socket: Socket;
  online: Set<number>;
  syncPresence: () => void;
  voiceStates: Record<number, VoiceChannelsState>;
  requestVoiceState: (serverId: number) => void;
}

export const SocketContext = createContext<SocketContextValue | null>(null);
