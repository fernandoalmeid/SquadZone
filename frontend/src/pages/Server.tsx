import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { serversApi } from "../api/app.ts";
import SidebarFooter from "../components/app/SidebarFooter.tsx";
import TextChannelView from "../components/chat/TextChannelView.tsx";
import CategoryModal from "../components/server/CategoryModal.tsx";
import ChannelModal from "../components/server/ChannelModal.tsx";
import ChannelSidebar from "../components/server/ChannelSidebar.tsx";
import InviteModal from "../components/server/InviteModal.tsx";
import MemberList from "../components/server/MemberList.tsx";
import ServerSettingsModal from "../components/server/ServerSettingsModal.tsx";
import type { ServerModal } from "../components/server/types.ts";
import Icon from "../components/ui/Icon.tsx";
import VoiceChannelView from "../components/voice/VoiceChannelView.tsx";
import { useAppData } from "../hooks/useAppData.ts";
import { useServerData } from "../hooks/useServerData.ts";
import { useSocket } from "../hooks/useSocket.ts";
import { useVoice } from "../hooks/useVoice.ts";
import type { Channel } from "../types/app.ts";
import { errorMessage } from "../utils/format.ts";

function ServerView({ serverId }: { serverId: number }) {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { refreshServers } = useAppData();
  const { data, notFound } = useServerData(serverId);
  const { voiceStates } = useSocket();
  const voice = useVoice();
  const [modal, setModal] = useState<ServerModal | null>(null);

  useEffect(() => {
    if (notFound) {
      void refreshServers();
      navigate("/friends", { replace: true });
    }
  }, [notFound, navigate, refreshServers]);

  if (!data) {
    return (
      <>
        <aside className="sidebar">
          <div className="sidebar-header" />
          <div className="sidebar-scroll" />
          <SidebarFooter />
        </aside>
        <main className="main">
          <p className="empty-state">Loading server…</p>
        </main>
      </>
    );
  }

  const activeId = channelId ? Number(channelId) : null;
  const channel = data.channels.find((item) => item.id === activeId) ?? null;

  if (!channel) {
    const fallback = data.channels.find((item) => item.type === "text") ?? data.channels[0];
    if (fallback) {
      return <Navigate to={`/servers/${serverId}/${fallback.id}`} replace />;
    }
    if (activeId !== null) {
      return <Navigate to={`/servers/${serverId}`} replace />;
    }
  }

  const voiceState = voiceStates[serverId] ?? {};

  const selectChannel = (item: Channel) => {
    navigate(`/servers/${serverId}/${item.id}`);
    if (item.type === "voice" && voice.channel?.id !== item.id) {
      void voice.join({ id: item.id, name: item.name, serverId, serverName: data.server.name });
    }
  };

  const leaveServer = async () => {
    if (!confirm(`Leave ${data.server.name}?`)) return;
    try {
      if (voice.channel?.serverId === serverId) voice.leave();
      await serversApi.leave(serverId);
      await refreshServers();
      navigate("/friends");
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  return (
    <>
      <aside className="sidebar">
        <ChannelSidebar
          data={data}
          activeChannelId={channel?.id ?? null}
          voiceState={voiceState}
          onSelect={selectChannel}
          onOpenModal={setModal}
          onLeave={() => void leaveServer()}
        />
        <SidebarFooter />
      </aside>

      <main className="main">
        <header className="main-header">
          <span className="main-header-title">
            {channel ? (
              <>
                <Icon name={channel.type === "voice" ? "speaker" : "hash"} />
                {channel.name}
              </>
            ) : (
              data.server.name
            )}
          </span>
        </header>

        <div className="main-body">
          {channel?.type === "text" && (
            <>
              <TextChannelView
                key={channel.id}
                channel={channel}
                members={data.members}
                roles={data.roles}
              />
              <MemberList members={data.members} roles={data.roles} />
            </>
          )}

          {channel?.type === "voice" && (
            <VoiceChannelView
              channel={channel}
              serverId={serverId}
              serverName={data.server.name}
              preview={voiceState[channel.id] ?? []}
            />
          )}

          {!channel && (
            <div className="voice-lobby">
              <h2>No channels here yet</h2>
              <p className="muted">
                {data.permissions.canManage
                  ? "Create a channel to get started."
                  : "You can't see any channels. Ask an admin for a role."}
              </p>
              {data.permissions.canManage && (
                <button type="button" className="btn primary" onClick={() => setModal({ type: "channel" })}>
                  Create channel
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {modal?.type === "settings" && <ServerSettingsModal data={data} onClose={() => setModal(null)} />}
      {modal?.type === "invite" && <InviteModal data={data} onClose={() => setModal(null)} />}
      {modal?.type === "category" && (
        <CategoryModal
          serverId={serverId}
          roles={data.roles}
          category={modal.category}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "channel" && (
        <ChannelModal
          serverId={serverId}
          categories={data.categories}
          channel={modal.channel}
          defaultCategoryId={modal.categoryId}
          onClose={() => setModal(null)}
          onCreated={(id) => navigate(`/servers/${serverId}/${id}`)}
        />
      )}
    </>
  );
}

function Server() {
  const { serverId } = useParams();
  const id = Number(serverId);

  if (!Number.isInteger(id) || id <= 0) {
    return <Navigate to="/friends" replace />;
  }

  return <ServerView key={id} serverId={id} />;
}

export default Server;
