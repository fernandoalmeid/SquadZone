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
