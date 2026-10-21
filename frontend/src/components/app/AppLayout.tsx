import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { serversApi } from "../../api/app.ts";
import { SocketProvider } from "../../context/SocketProvider.tsx";
import { VoiceProvider } from "../../context/VoiceProvider.tsx";
import { useSocket } from "../../hooks/useSocket.ts";
import type { AppOutletContext } from "../../hooks/useAppData.ts";
import type { ServerSummary } from "../../types/app.ts";
import CreateServerModal from "./CreateServerModal.tsx";
import ServerRail from "./ServerRail.tsx";

function AppShell() {
  const { socket, syncPresence } = useSocket();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("squadzone_appearance");
      if (!raw) return;
      const data = JSON.parse(raw) as { mode?: string; color?: string; image?: string | null; dim?: number };
      const root = document.querySelector(".app") as HTMLElement | null;
      if (!root || !data.mode || data.mode === "default") return;
      root.classList.add("has-custom-bg");
      if (data.color) root.style.setProperty("--sz-custom-bg-color", data.color);
      if (data.image) root.style.setProperty("--sz-custom-bg-image", `url(${data.image})`);
      if (typeof data.dim === "number") root.style.setProperty("--sz-custom-bg-dim", String(data.dim / 100));
    } catch {
      /* ignore */
    }
  }, []);

  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const refreshServers = useCallback(
    () =>
      serversApi
        .list()
        .then((result) => {
          setServers(result.servers);
          syncPresence();
        })
        .catch(() => setServers([])),
    [syncPresence],
  );

  useEffect(() => {
    void refreshServers();
  }, [refreshServers]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => void refreshServers();
    socket.on("servers:update", onUpdate);
    return () => {
      socket.off("servers:update", onUpdate);
    };
  }, [socket, refreshServers]);

  const context: AppOutletContext = { servers, refreshServers };

  return (
    <div className="app">
      <ServerRail servers={servers} onAddServer={() => setShowCreate(true)} />
      <Outlet context={context} />
      {showCreate && (
        <CreateServerModal onClose={() => setShowCreate(false)} onDone={refreshServers} />
      )}
    </div>
  );
}

function AppLayout() {
  return (
    <SocketProvider>
      <VoiceProvider>
        <AppShell />
      </VoiceProvider>
    </SocketProvider>
  );
}

export default AppLayout;
