import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { tokenStorage } from "../api/client.ts";
import { useAuth } from "../hooks/useAuth.ts";
import type { VoiceChannelsState } from "../types/app.ts";
import { SocketContext } from "./SocketContext.ts";

export function SocketProvider({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [socket] = useState<Socket>(() =>
    io({ auth: { token: tokenStorage.get() }, autoConnect: false }),
  );
  const [online, setOnline] = useState<Set<number>>(() => new Set());
  const [voiceStates, setVoiceStates] = useState<Record<number, VoiceChannelsState>>({});

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const syncPresence = useCallback(() => {
    socket.emit("presence:sync", null, (response: { online: number[] }) => {
      setOnline(new Set(response.online));
    });
  }, [socket]);

  const requestVoiceState = useCallback(
    (serverId: number) => {
      socket.emit("voice:state:get", { serverId }, (channels: VoiceChannelsState) => {
        setVoiceStates((current) => ({ ...current, [serverId]: channels }));
      });
    },
    [socket],
  );

  useEffect(() => {
    const onPresence = ({ userId, online: isOnline }: { userId: number; online: boolean }) => {
      setOnline((current) => {
        const next = new Set(current);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    const onVoiceState = ({
      serverId,
      channels,
    }: {
      serverId: number;
      channels: VoiceChannelsState;
    }) => {
      setVoiceStates((current) => ({ ...current, [serverId]: channels }));
    };

    const onConnectError = (err: Error) => {
      if (err.message === "Not authenticated") {
        logout();
      }
    };

    socket.on("connect", syncPresence);
    socket.on("presence:update", onPresence);
    socket.on("voice:state", onVoiceState);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", syncPresence);
      socket.off("presence:update", onPresence);
      socket.off("voice:state", onVoiceState);
      socket.off("connect_error", onConnectError);
    };
  }, [socket, syncPresence, logout]);

  const value = useMemo(
    () => ({ socket, online, syncPresence, voiceStates, requestVoiceState }),
    [socket, online, syncPresence, voiceStates, requestVoiceState],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
