import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth.ts";
import { errorMessage } from "../../utils/format.ts";
import Avatar from "../ui/Avatar.tsx";
import Icon from "../ui/Icon.tsx";

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

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

interface UserSettingsModalProps {
  onClose: () => void;
}

function UserSettingsModal({ onClose }: UserSettingsModalProps) {
  const { user, updateUser } = useAuth();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const [section, setSection] = useState<"account" | "profile">("profile");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [banner, setBanner] = useState<string | null>(user?.banner ?? null);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState(
    user?.avatar && isHttpUrl(user.avatar) ? user.avatar : "",
  );
  const [bannerUrlDraft, setBannerUrlDraft] = useState(
    user?.banner && isHttpUrl(user.banner) ? user.banner : "",
  );
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [bannerChanged, setBannerChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!user) return null;

  const applyAvatarUrl = () => {
    const url = avatarUrlDraft.trim();
    if (!url) {
      setError("Paste an image or GIF URL first");
      return;
    }
    if (!isHttpUrl(url)) {
      setError("URL must start with http:// or https://");
      return;
    }
    setAvatar(url);
    setAvatarChanged(true);
    setError(null);
  };

  const applyBannerUrl = () => {
    const url = bannerUrlDraft.trim();
    if (!url) {
      setError("Paste an image or GIF URL first");
      return;
    }
    if (!isHttpUrl(url)) {
      setError("URL must start with http:// or https://");
      return;
    }
    setBanner(url);
    setBannerChanged(true);
    setError(null);
  };

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = await readFileAsDataUrl(file, AVATAR_MAX);
      setAvatar(data);
      setAvatarUrlDraft("");
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
      setBannerUrlDraft("");
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
    <div className="settings-overlay" onMouseDown={onClose}>
      <div
        className="settings-shell"
        role="dialog"
        aria-modal="true"
        aria-label="User Settings"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <aside className="settings-nav">
          <p className="settings-nav-label">User Settings</p>
          <button
            type="button"
            className={section === "profile" ? "active" : ""}
            onClick={() => setSection("profile")}
          >
            Profiles
          </button>
          <button
            type="button"
            className={section === "account" ? "active" : ""}
            onClick={() => setSection("account")}
          >
            My Account
          </button>
          <div className="settings-nav-spacer" />
          <button type="button" className="settings-nav-close" onClick={onClose}>
            <Icon name="x" size={20} />
            <span>Esc</span>
          </button>
        </aside>

        <section className="settings-content">
          <header className="settings-content-header">
            <h2>{section === "profile" ? "Profiles" : "My Account"}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </header>

          <form className="settings-form" onSubmit={handleSubmit}>
            {section === "account" && (
              <div className="settings-card">
                <p className="settings-section-title">Account</p>
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
                  <span>Email</span>
                  <input value={user.email} disabled />
                </label>
              </div>
            )}

            {section === "profile" && (
              <>
                <div className="settings-card profile-card">
                  <p className="settings-section-title">Profile preview</p>

                  <div className="profile-preview">
                    <div
                      className="profile-banner"
                      style={banner ? { backgroundImage: `url(${banner})` } : undefined}
                    >
                      <div className="profile-banner-actions">
                        <button
                          type="button"
                          className="profile-upload-btn"
                          onClick={() => bannerInput.current?.click()}
                          title="Upload banner"
                        >
                          <Icon name="image" size={18} />
                        </button>
                        {banner && (
                          <button
                            type="button"
                            className="profile-upload-btn remove"
                            onClick={() => {
                              setBanner(null);
                              setBannerUrlDraft("");
                              setBannerChanged(true);
                            }}
                            title="Remove banner"
                          >
                            <Icon name="x" size={16} />
                          </button>
                        )}
                      </div>
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

                    <div className="profile-avatar-row">
                      <div className="profile-avatar-wrap">
                        <Avatar
                          id={user.id}
                          name={username || user.username}
                          size={84}
                          src={avatar}
                        />
                        <button
                          type="button"
                          className="profile-upload-btn on-avatar"
                          onClick={() => avatarInput.current?.click()}
                          title="Upload avatar"
                        >
                          <Icon name="image" size={16} />
                        </button>
                      </div>
                      <div className="profile-preview-meta">
                        <strong>{username || user.username}</strong>
                        {bio.trim() ? (
                          <p className="muted small">{bio.trim()}</p>
                        ) : (
                          <p className="muted small">No about me yet</p>
                        )}
                      </div>
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
                  </div>
                </div>

                <div className="settings-card">
                  <p className="settings-section-title">Avatar</p>
                  <p className="muted small settings-help">
                    Upload a file or paste a direct image/GIF URL (Giphy, Tenor, Imgur, etc.).
                  </p>
                  <div className="url-row">
                    <input
                      value={avatarUrlDraft}
                      onChange={(e) => setAvatarUrlDraft(e.target.value)}
                      placeholder="https://…/cool.gif"
                    />
                    <button type="button" className="btn ghost" onClick={applyAvatarUrl}>
                      Use URL
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => avatarInput.current?.click()}
                    >
                      Upload
                    </button>
                    {avatar && (
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => {
                          setAvatar(null);
                          setAvatarUrlDraft("");
                          setAvatarChanged(true);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="settings-card">
                  <p className="settings-section-title">Banner</p>
                  <p className="muted small settings-help">
                    Same as avatar — file upload or a web GIF/image link.
                  </p>
                  <div className="url-row">
                    <input
                      value={bannerUrlDraft}
                      onChange={(e) => setBannerUrlDraft(e.target.value)}
                      placeholder="https://…/banner.gif"
                    />
                    <button type="button" className="btn ghost" onClick={applyBannerUrl}>
                      Use URL
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => bannerInput.current?.click()}
                    >
                      Upload
                    </button>
                    {banner && (
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => {
                          setBanner(null);
                          setBannerUrlDraft("");
                          setBannerChanged(true);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="settings-card">
                  <p className="settings-section-title">About me</p>
                  <label className="field">
                    <span>Bio</span>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={190}
                      rows={3}
                      placeholder="Tell people a bit about yourself"
                    />
                    <span className="field-count">{bio.length}/190</span>
                  </label>
                </div>
              </>
            )}

            {error && <p className="form-error">{error}</p>}

            <div className="settings-footer">
              <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default UserSettingsModal;
