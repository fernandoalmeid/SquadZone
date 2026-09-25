import { useCallback, useEffect, useState } from "react";
import { friendsApi } from "../api/app.ts";
import type { FriendsData } from "../types/app.ts";
import { useSocket } from "./useSocket.ts";

const EMPTY: FriendsData = { friends: [], incoming: [], outgoing: [] };

export function useFriends() {
  const { socket, syncPresence } = useSocket();
  const [data, setData] = useState<FriendsData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await friendsApi.list();
      setData(result);
      syncPresence();
    } finally {
      setLoading(false);
    }
  }, [syncPresence]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => void refresh();
    socket.on("friends:update", onUpdate);
    return () => {
      socket.off("friends:update", onUpdate);
    };
  }, [socket, refresh]);

  return { ...data, loading, refresh };
}
