const COLORS = ["#6a55cc", "#8b7fd6", "#5b45c4", "#3f8fb8", "#4aa37c", "#c0679a", "#d08a4f", "#7a5fd6"];

interface AvatarProps {
  id: number;
  name: string;
  size?: number;
  status?: "online" | "offline";
  src?: string | null;
}

function Avatar({ id, name, size = 32, status, src }: AvatarProps) {
  return (
    <span
      className={`avatar${src ? " has-image" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: src ? "transparent" : COLORS[id % COLORS.length],
      }}
    >
      {src ? <img src={src} alt="" /> : name.charAt(0).toUpperCase()}
      {status && <span className={`status-dot ${status}`} />}
    </span>
  );
}

export default Avatar;
