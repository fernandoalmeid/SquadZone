import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.ts";
import { useVoice } from "../../hooks/useVoice.ts";
import Avatar from "../ui/Avatar.tsx";
import Icon from "../ui/Icon.tsx";

function VoicePanel() {
  const voice = useVoice();

  if (!voice.channel) {
    return voice.error ? <p className="voice-panel-error">{voice.error}</p> : null;
  }

  const sharing = voice.localScreenStream !== null;

  return (
    <div className="voice-panel">
      <div className="voice-panel-info">
        <span className="voice-panel-status">Voice connected</span>
        <Link to={`/servers/${voice.channel.serverId}/${voice.channel.id}`} className="voice-panel-where">
          {voice.channel.name} / {voice.channel.serverName}
        </Link>
      </div>
      <div className="voice-panel-actions">
        <button
          type="button"
          className={`icon-btn${sharing ? " active" : ""}`}
          onClick={sharing ? voice.stopScreenShare : voice.startScreenShare}
          title={sharing ? "Stop sharing" : "Share your screen"}
        >
          <Icon name="screen" />
        </button>
        <button type="button" className="icon-btn danger" onClick={voice.leave} title="Disconnect">
          <Icon name="phoneOff" />
        </button>
      </div>
    </div>
  );
}

function UserPanel() {
  const { user, logout } = useAuth();
  const voice = useVoice();

  if (!user) return null;

  return (
    <div className="user-panel">
      <Avatar id={user.id} name={user.username} size={34} status="online" />
      <div className="user-panel-name">
        <strong>{user.username}</strong>
        <span>Online</span>
      </div>
      <button
        type="button"
        className={`icon-btn${voice.muted ? " off" : ""}`}
        onClick={voice.toggleMute}
        title={voice.muted ? "Unmute" : "Mute"}
      >
        <Icon name={voice.muted ? "micOff" : "mic"} />
      </button>
      <button
        type="button"
        className={`icon-btn${voice.deafened ? " off" : ""}`}
        onClick={voice.toggleDeafen}
        title={voice.deafened ? "Undeafen" : "Deafen"}
      >
        <Icon name={voice.deafened ? "headphonesOff" : "headphones"} />
      </button>
      <button type="button" className="icon-btn" onClick={logout} title="Log out">
        <Icon name="logout" />
      </button>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="sidebar-footer">
      <VoicePanel />
      <UserPanel />
    </div>
  );
}

export default SidebarFooter;
