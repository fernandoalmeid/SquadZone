import { useCallback, useEffect, useState } from "react";
import { serversApi } from "../api/app.ts";
import { ApiError } from "../api/client.ts";
import type { ServerDetails } from "../types/app.ts";
import { useSocket } from "./useSocket.ts";

export function useServerData(serverId: number) {
  const { socket, syncPresence, requestVoiceState } = useSocket();
  const [data, setData] = useState<ServerDetails | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(
    () =>
      serversApi
        .get(serverId)
        .then((result) => {
          setData(result);
          syncPresence();
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError && [400, 403, 404].includes(err.status)) {
            setNotFound(true);
          }
        }),
    [serverId, syncPresence],
  );

  useEffect(() => {
    void refresh();
    requestVoiceState(serverId);
  }, [refresh, requestVoiceState, serverId]);

  useEffect(() => {
    if (!socket) return;

    const onUpdate = (payload: { serverId: number }) => {
      if (payload.serverId === serverId) void refresh();
    };
    const onConnect = () => {
      void refresh();
      requestVoiceState(serverId);
    };

    socket.on("server:update", onUpdate);
    socket.on("connect", onConnect);
    return () => {
      socket.off("server:update", onUpdate);
      socket.off("connect", onConnect);
    };
  }, [socket, serverId, refresh, requestVoiceState]);

  return { data, notFound, refresh };
}
