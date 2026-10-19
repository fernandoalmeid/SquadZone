import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth.ts";
import { errorMessage } from "../../utils/format.ts";
import Avatar from "../ui/Avatar.tsx";
import Icon from "../ui/Icon.tsx";
import Modal from "../ui/Modal.tsx";

const AVATAR_MAX = 2 * 1024 * 1024;
const BANNER_MAX = 4 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/jpg,image/gif,image/webp";

function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/^image\/(png|jpe?g|gif|webp)$/i)) {
      reject(new Error("Use PNG, JPEG, GIF or WebP"));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error(`Image must be under ${Math.round(maxBytes / 1024 / 1024)}MB`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

interface UserSettingsModalProps {
  onClose: () => void;
}

function UserSettingsModal({ onClose }: UserSettingsModalProps) {
  const { user, updateUser } = useAuth();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [banner, setBanner] = useState<string | null>(user?.banner ?? null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [bannerChanged, setBannerChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = await readFileAsDataUrl(file, AVATAR_MAX);
      setAvatar(data);
      setAvatarChanged(true);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const onPickBanner = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = await readFileAsDataUrl(file, BANNER_MAX);
      setBanner(data);
      setBannerChanged(true);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateUser({
        username: username.trim(),
        bio: bio.trim(),
        ...(avatarChanged ? { avatar } : {}),
        ...(bannerChanged ? { banner } : {}),
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="User Settings" onClose={onClose} wide>
      <form className="profile-settings" onSubmit={handleSubmit}>
        <div className="profile-preview">
          <div
            className="profile-banner"
            style={banner ? { backgroundImage: `url(${banner})` } : undefined}
          >
            <button
              type="button"
              className="profile-upload-btn"
              onClick={() => bannerInput.current?.click()}
              title="Change banner"
            >
              <Icon name="image" size={18} />
            </button>
            {banner && (
              <button
                type="button"
                className="profile-upload-btn remove"
                onClick={() => {
                  setBanner(null);
                  setBannerChanged(true);
                }}
                title="Remove banner"
              >
                <Icon name="x" size={16} />
              </button>
            )}
            <input
              ref={bannerInput}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                void onPickBanner(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="profile-avatar-wrap">
            <Avatar id={user.id} name={username || user.username} size={80} src={avatar} />
            <button
              type="button"
              className="profile-upload-btn on-avatar"
              onClick={() => avatarInput.current?.click()}
              title="Change avatar"
            >
              <Icon name="image" size={16} />
            </button>
            {avatar && (
              <button
                type="button"
                className="profile-upload-btn on-avatar remove"
                onClick={() => {
                  setAvatar(null);
                  setAvatarChanged(true);
                }}
                title="Remove avatar"
              >
                <Icon name="x" size={14} />
              </button>
            )}
            <input
              ref={avatarInput}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                void onPickAvatar(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="profile-preview-meta">
            <strong>{username || user.username}</strong>
            {bio.trim() && <p className="muted small">{bio.trim()}</p>}
          </div>
        </div>

        <p className="muted small profile-hint">
          PNG, JPEG, GIF or WebP — GIFs stay animated. Avatar up to 2MB, banner up to 4MB.
        </p>

        <label className="field">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={50}
            required
            pattern="[a-zA-Z0-9_]{3,50}"
          />
        </label>

        <label className="field">
          <span>About me</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={190}
            rows={3}
            placeholder="Tell people a bit about yourself"
          />
          <span className="field-count">{bio.length}/190</span>
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default UserSettingsModal;
