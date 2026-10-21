import type { BasicUser } from "../../types/app.ts";
import Avatar from "./Avatar.tsx";

interface ProfileCardProps {
  user: BasicUser;
  online?: boolean;
  onMessage?: () => void;
  onClose?: () => void;
}

function ProfileCard({ user, online, onMessage, onClose }: ProfileCardProps) {
  return (
    <div className="sz-profile-card" role="dialog" aria-label={`${user.username} profile`}>
      <div
        className="sz-profile-card-banner"
        style={user.banner ? { backgroundImage: `url(${user.banner})` } : undefined}
      />
      <div className="sz-profile-card-body">
        <Avatar
          id={user.id}
          name={user.username}
          size={80}
          status={online === undefined ? undefined : online ? "online" : "offline"}
          src={user.avatar}
        />
        <div className="sz-profile-card-info">
          <strong>{user.username}</strong>
          {online !== undefined && (
            <span className="muted small">{online ? "Online" : "Offline"}</span>
          )}
          <p className="sz-profile-card-bio">{user.bio?.trim() || "No about me yet"}</p>
        </div>
        {onMessage && (
          <button type="button" className="btn primary" onClick={onMessage}>
            Message
          </button>
        )}
        {onClose && (
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}

export default ProfileCard;
