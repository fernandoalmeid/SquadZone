import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/useAuth.ts";
import { errorMessage } from "../../utils/format.ts";
import Avatar from "../ui/Avatar.tsx";
import Icon from "../ui/Icon.tsx";

const AVATAR_MAX = 2 * 1024 * 1024;
const BANNER_MAX = 4 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/jpg,image/gif,image/webp";

type Section =
  | "my-account"
  | "profiles"
  | "privacy"
  | "notifications"
  | "voice"
  | "appearance"
  | "language";

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

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sz-settings-nav-group">
      <p className="sz-settings-nav-label">{label}</p>
      {children}
    </div>
  );
}

function NavItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`sz-settings-nav-item${active ? " active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function SettingsCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="sz-settings-card">
      {title && <h3 className="sz-settings-card-title">{title}</h3>}
      {children}
    </div>
  );
}

function UserSettingsModal({ onClose }: UserSettingsModalProps) {
  const { user, updateUser, logout } = useAuth();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const [section, setSection] = useState<Section>("profiles");
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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [compactMode, setCompactMode] = useState(false);
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [soundNotifs, setSoundNotifs] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const [allowDms, setAllowDms] = useState(true);
  const [inputSensitivity, setInputSensitivity] = useState(50);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
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
    setSaved(false);
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
    setSaved(false);
  };

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = await readFileAsDataUrl(file, AVATAR_MAX);
      setAvatar(data);
      setAvatarUrlDraft("");
      setAvatarChanged(true);
      setError(null);
      setSaved(false);
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
      setSaved(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleSaveProfile = async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateUser({
        username: username.trim(),
        bio: bio.trim(),
        ...(avatarChanged ? { avatar } : {}),
        ...(bannerChanged ? { banner } : {}),
      });
      setAvatarChanged(false);
      setBannerChanged(false);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Section, string> = {
    "my-account": "My Account",
    profiles: "Profiles",
    privacy: "Privacy & Safety",
    notifications: "Notifications",
    voice: "Voice & Video",
    appearance: "Appearance",
    language: "Language",
  };

  const panel = (
    <div className="sz-settings-overlay" role="presentation">
      <div className="sz-settings-window" role="dialog" aria-modal="true" aria-label="User Settings">
        <aside className="sz-settings-sidebar">
          <div className="sz-settings-user-chip">
            <Avatar id={user.id} name={user.username} size={40} src={user.avatar} />
            <div>
              <strong>{user.username}</strong>
              <span>Edit profile</span>
            </div>
          </div>

          <NavGroup label="User Settings">
            <NavItem active={section === "my-account"} onClick={() => setSection("my-account")}>
              My Account
            </NavItem>
            <NavItem active={section === "profiles"} onClick={() => setSection("profiles")}>
              Profiles
            </NavItem>
            <NavItem active={section === "privacy"} onClick={() => setSection("privacy")}>
              Privacy & Safety
            </NavItem>
            <NavItem active={section === "notifications"} onClick={() => setSection("notifications")}>
              Notifications
            </NavItem>
          </NavGroup>

          <NavGroup label="App Settings">
            <NavItem active={section === "voice"} onClick={() => setSection("voice")}>
              Voice & Video
            </NavItem>
            <NavItem active={section === "appearance"} onClick={() => setSection("appearance")}>
              Appearance
            </NavItem>
            <NavItem active={section === "language"} onClick={() => setSection("language")}>
              Language
            </NavItem>
          </NavGroup>

          <NavGroup label=" ">
            <button
              type="button"
              className="sz-settings-nav-item danger"
              onClick={() => {
                onClose();
                logout();
              }}
            >
              Log Out
            </button>
          </NavGroup>
        </aside>

        <main className="sz-settings-main">
          <header className="sz-settings-main-header">
            <h2>{titles[section]}</h2>
            <button type="button" className="sz-settings-close" onClick={onClose} title="Close (Esc)">
              <Icon name="x" size={20} />
              <span>ESC</span>
            </button>
          </header>

          <div className="sz-settings-main-body">
            {section === "my-account" && (
              <>
                <SettingsCard title="Account Information">
                  <div className="sz-settings-account-row">
                    <Avatar id={user.id} name={username || user.username} size={72} src={avatar} />
                    <div className="sz-settings-account-meta">
                      <strong>{username || user.username}</strong>
                      <span className="muted">{user.email}</span>
                      <button type="button" className="btn primary small" onClick={() => setSection("profiles")}>
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard title="Username">
                  <label className="sz-field">
                    <span>Username</span>
                    <input
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setSaved(false);
                      }}
                      maxLength={50}
                      pattern="[a-zA-Z0-9_]{3,50}"
                    />
                  </label>
                  <p className="muted small">3–50 characters. Letters, numbers and underscore only.</p>
                </SettingsCard>

                <SettingsCard title="Email">
                  <label className="sz-field">
                    <span>Email address</span>
                    <input value={user.email} disabled />
                  </label>
                </SettingsCard>

                <div className="sz-settings-actions">
                  <button type="button" className="btn primary" disabled={busy} onClick={() => void handleSaveProfile()}>
                    {busy ? "Saving…" : "Save Changes"}
                  </button>
                  {saved && <span className="sz-saved">Saved</span>}
                </div>
              </>
            )}

            {section === "profiles" && (
              <form onSubmit={(e) => void handleSaveProfile(e)}>
                <SettingsCard title="Profile Preview">
                  <div className="sz-profile-preview">
                    <div
                      className="sz-profile-banner"
                      style={banner ? { backgroundImage: `url(${banner})` } : undefined}
                    />
                    <div className="sz-profile-body">
                      <Avatar id={user.id} name={username || user.username} size={80} src={avatar} />
                      <div>
                        <strong>{username || user.username}</strong>
                        <p className="muted small">{bio.trim() || "No about me yet"}</p>
                      </div>
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard title="Avatar">
                  <p className="muted small sz-help">
                    Upload a file or paste a direct image/GIF URL (Giphy, Tenor, Imgur…).
                  </p>
                  <div className="sz-url-row">
                    <input
                      value={avatarUrlDraft}
                      onChange={(e) => setAvatarUrlDraft(e.target.value)}
                      placeholder="https://media.giphy.com/.../giphy.gif"
                    />
                    <button type="button" className="btn ghost" onClick={applyAvatarUrl}>
                      Use URL
                    </button>
                    <button type="button" className="btn ghost" onClick={() => avatarInput.current?.click()}>
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
                          setSaved(false);
                        }}
                      >
                        Remove
                      </button>
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
                </SettingsCard>

                <SettingsCard title="Banner">
                  <p className="muted small sz-help">Same options — file or a web GIF/image link.</p>
                  <div className="sz-url-row">
                    <input
                      value={bannerUrlDraft}
                      onChange={(e) => setBannerUrlDraft(e.target.value)}
                      placeholder="https://…/banner.gif"
                    />
                    <button type="button" className="btn ghost" onClick={applyBannerUrl}>
                      Use URL
                    </button>
                    <button type="button" className="btn ghost" onClick={() => bannerInput.current?.click()}>
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
                          setSaved(false);
                        }}
                      >
                        Remove
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
                </SettingsCard>

                <SettingsCard title="About Me">
                  <label className="sz-field">
                    <span>Bio</span>
                    <textarea
                      value={bio}
                      onChange={(e) => {
                        setBio(e.target.value);
                        setSaved(false);
                      }}
                      maxLength={190}
                      rows={3}
                      placeholder="Tell people a bit about yourself"
                    />
                    <span className="sz-field-count">{bio.length}/190</span>
                  </label>
                </SettingsCard>

                {error && <p className="form-error">{error}</p>}

                <div className="sz-settings-actions">
                  <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className="btn primary" disabled={busy}>
                    {busy ? "Saving…" : "Save Changes"}
                  </button>
                  {saved && <span className="sz-saved">Saved</span>}
                </div>
              </form>
            )}

            {section === "privacy" && (
              <>
                <SettingsCard title="Online Status">
                  <label className="sz-toggle-row">
                    <div>
                      <strong>Show when I'm online</strong>
                      <p className="muted small">Others can see your online status in servers and friends.</p>
                    </div>
                    <input type="checkbox" checked={showOnline} onChange={(e) => setShowOnline(e.target.checked)} />
                  </label>
                </SettingsCard>
                <SettingsCard title="Direct Messages">
                  <label className="sz-toggle-row">
                    <div>
                      <strong>Allow direct messages from server members</strong>
                      <p className="muted small">People in shared servers can message you (coming soon).</p>
                    </div>
                    <input type="checkbox" checked={allowDms} onChange={(e) => setAllowDms(e.target.checked)} />
                  </label>
                </SettingsCard>
              </>
            )}

            {section === "notifications" && (
              <>
                <SettingsCard title="Desktop Notifications">
                  <label className="sz-toggle-row">
                    <div>
                      <strong>Enable desktop notifications</strong>
                      <p className="muted small">Get notified when you receive messages or friend requests.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={desktopNotifs}
                      onChange={(e) => setDesktopNotifs(e.target.checked)}
                    />
                  </label>
                </SettingsCard>
                <SettingsCard title="Sounds">
                  <label className="sz-toggle-row">
                    <div>
                      <strong>Notification sounds</strong>
                      <p className="muted small">Play a sound for new messages and calls.</p>
                    </div>
                    <input type="checkbox" checked={soundNotifs} onChange={(e) => setSoundNotifs(e.target.checked)} />
                  </label>
                </SettingsCard>
              </>
            )}

            {section === "voice" && (
              <>
                <SettingsCard title="Input Sensitivity">
                  <label className="sz-field">
                    <span>Microphone sensitivity</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={inputSensitivity}
                      onChange={(e) => setInputSensitivity(Number(e.target.value))}
                    />
                    <span className="muted small">{inputSensitivity}%</span>
                  </label>
                </SettingsCard>
                <SettingsCard title="Audio Processing">
                  <label className="sz-toggle-row">
                    <div>
                      <strong>Echo cancellation</strong>
                      <p className="muted small">Reduce echo from your speakers.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={echoCancellation}
                      onChange={(e) => setEchoCancellation(e.target.checked)}
                    />
                  </label>
                  <label className="sz-toggle-row">
                    <div>
                      <strong>Noise suppression</strong>
                      <p className="muted small">Filter background noise from your mic.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={noiseSuppression}
                      onChange={(e) => setNoiseSuppression(e.target.checked)}
                    />
                  </label>
                </SettingsCard>
              </>
            )}

            {section === "appearance" && (
              <SettingsCard title="Message Display">
                <label className="sz-toggle-row">
                  <div>
                    <strong>Compact mode</strong>
                    <p className="muted small">Show more messages on screen with tighter spacing.</p>
                  </div>
                  <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} />
                </label>
                <p className="muted small" style={{ marginTop: 12 }}>
                  Theme is locked to SquadZone purple for now.
                </p>
              </SettingsCard>
            )}

            {section === "language" && (
              <SettingsCard title="Language">
                <label className="sz-field">
                  <span>App language</span>
                  <select defaultValue="en">
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                    <option value="es">Español</option>
                  </select>
                </label>
                <p className="muted small">Language switching will be fully wired in a later update.</p>
              </SettingsCard>
            )}
          </div>
        </main>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

export default UserSettingsModal;
