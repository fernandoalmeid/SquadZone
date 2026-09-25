import { useState } from "react";
import type { Category, Channel, ServerDetails, VoiceChannelsState } from "../../types/app.ts";
import Avatar from "../ui/Avatar.tsx";
import Icon from "../ui/Icon.tsx";
import type { ServerModal } from "./types.ts";

interface ChannelSidebarProps {
  data: ServerDetails;
  activeChannelId: number | null;
  voiceState: VoiceChannelsState;
  onSelect: (channel: Channel) => void;
  onOpenModal: (modal: ServerModal) => void;
  onLeave: () => void;
}

function ChannelSidebar({
  data,
  activeChannelId,
  voiceState,
  onSelect,
  onOpenModal,
  onLeave,
}: ChannelSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const { canManage, isOwner } = data.permissions;

  const toggleCategory = (id: number) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const menuAction = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  const renderChannel = (channel: Channel) => {
    const participants = channel.type === "voice" ? (voiceState[channel.id] ?? []) : [];

    return (
      <li key={channel.id}>
        <div className={`channel-item${channel.id === activeChannelId ? " active" : ""}`}>
          <button type="button" className="channel-link" onClick={() => onSelect(channel)}>
            <Icon name={channel.type === "voice" ? "speaker" : "hash"} size={17} />
            <span>{channel.name}</span>
          </button>
          {canManage && (
            <button
              type="button"
              className="icon-btn small hover-only"
              title="Edit channel"
              onClick={() => onOpenModal({ type: "channel", channel })}
            >
              <Icon name="gear" size={15} />
            </button>
          )}
        </div>

        {participants.length > 0 && (
          <ul className="voice-users">
            {participants.map((participant) => (
              <li key={participant.socketId}>
                <Avatar id={participant.userId} name={participant.username} size={22} />
                <span>{participant.username}</span>
                {participant.screenStreamId && <span className="live-pill">Live</span>}
                {participant.deafened ? (
                  <Icon name="headphonesOff" size={14} />
                ) : (
                  participant.muted && <Icon name="micOff" size={14} />
                )}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  const channelsIn = (categoryId: number | null) =>
    data.channels.filter((channel) => channel.categoryId === categoryId);

  const renderCategory = (category: Category) => {
    const isCollapsed = collapsed.has(category.id);
    const channels = channelsIn(category.id);
    const visible = isCollapsed
      ? channels.filter(
          (channel) =>
            channel.id === activeChannelId || (voiceState[channel.id]?.length ?? 0) > 0,
        )
      : channels;

    return (
      <section key={category.id} className="category">
        <div className="category-header">
          <button type="button" className="category-toggle" onClick={() => toggleCategory(category.id)}>
            <Icon name={isCollapsed ? "chevronRight" : "chevronDown"} size={13} />
            <span>{category.name}</span>
            {category.isPrivate && <Icon name="lock" size={12} />}
          </button>
          {canManage && (
            <>
              <button
                type="button"
                className="icon-btn small hover-only"
                title="Edit category"
                onClick={() => onOpenModal({ type: "category", category })}
              >
                <Icon name="gear" size={14} />
              </button>
              <button
                type="button"
                className="icon-btn small"
                title="Create channel"
                onClick={() => onOpenModal({ type: "channel", categoryId: category.id })}
              >
                <Icon name="plus" size={15} />
              </button>
            </>
          )}
        </div>
        <ul className="channel-list">{visible.map(renderChannel)}</ul>
      </section>
    );
  };

  const uncategorized = channelsIn(null);

  return (
    <>
      <div className="sidebar-header server-header">
        <button type="button" className="server-menu-toggle" onClick={() => setMenuOpen((open) => !open)}>
          <strong>{data.server.name}</strong>
          <Icon name={menuOpen ? "x" : "chevronDown"} size={16} />
        </button>

        {menuOpen && (
          <div className="dropdown" role="menu">
            <button type="button" onClick={menuAction(() => onOpenModal({ type: "invite" }))}>
              <Icon name="userPlus" /> Invite people
            </button>
            {canManage && (
              <>
                <button type="button" onClick={menuAction(() => onOpenModal({ type: "settings" }))}>
                  <Icon name="gear" /> Server settings
                </button>
                <button type="button" onClick={menuAction(() => onOpenModal({ type: "channel" }))}>
                  <Icon name="plus" /> Create channel
                </button>
                <button type="button" onClick={menuAction(() => onOpenModal({ type: "category" }))}>
                  <Icon name="folder" /> Create category
                </button>
              </>
            )}
            {!isOwner && (
              <button type="button" className="danger" onClick={menuAction(onLeave)}>
                <Icon name="logout" /> Leave server
              </button>
            )}
          </div>
        )}
      </div>

      <div className="sidebar-scroll">
        {uncategorized.length > 0 && <ul className="channel-list">{uncategorized.map(renderChannel)}</ul>}
        {data.categories.map(renderCategory)}
        {data.channels.length === 0 && data.categories.length === 0 && (
          <p className="sidebar-empty">No channels you can see yet.</p>
        )}
      </div>
    </>
  );
}

export default ChannelSidebar;
