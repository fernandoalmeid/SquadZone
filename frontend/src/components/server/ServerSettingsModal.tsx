import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { serversApi } from "../../api/app.ts";
import { useAuth } from "../../hooks/useAuth.ts";
import type { Role, ServerDetails } from "../../types/app.ts";
import { errorMessage } from "../../utils/format.ts";
import Avatar from "../ui/Avatar.tsx";
import Icon from "../ui/Icon.tsx";
import Modal from "../ui/Modal.tsx";
import RolePicker from "./RolePicker.tsx";

type Tab = "overview" | "roles" | "members";

interface SettingsProps {
  data: ServerDetails;
  setError: (message: string) => void;
}

function Overview({ data, setError }: SettingsProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(data.server.name);
  const [saved, setSaved] = useState(false);

  const handleRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await serversApi.rename(data.server.id, name);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async () => {
    const answer = prompt(`Type the server name to delete it forever:\n${data.server.name}`);
    if (answer !== data.server.name) return;
    try {
      await serversApi.remove(data.server.id);
      navigate("/friends");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="stack">
      <form className="inline-form" onSubmit={handleRename}>
        <label className="form-field grow">
          <span>Server name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
        </label>
        <button type="submit" className="btn primary">
          {saved ? "Saved" : "Save"}
        </button>
      </form>

      <div className="form-field">
        <span>Invite code</span>
        <div className="copy-field">
          <code>{data.server.inviteCode}</code>
          <button type="button" className="btn ghost" onClick={() => void serversApi.newInvite(data.server.id)}>
            <Icon name="refresh" /> New code
          </button>
        </div>
      </div>

      {data.permissions.isOwner && (
        <div className="danger-zone">
          <div>
            <strong>Delete server</strong>
            <p className="muted small">Removes every channel, role and message. This can't be undone.</p>
          </div>
          <button type="button" className="btn danger" onClick={handleDelete}>
            Delete server
          </button>
        </div>
      )}
    </div>
  );
}

interface RoleFormProps {
  role?: Role;
  canSetAdmin: boolean;
  onSave: (input: { name: string; color: string; isAdmin: boolean }) => Promise<void>;
  onCancel: () => void;
}

function RoleForm({ role, canSetAdmin, onSave, onCancel }: RoleFormProps) {
  const [name, setName] = useState(role?.name ?? "");
  const [color, setColor] = useState(role?.color ?? "#8b7fd6");
  const [isAdmin, setIsAdmin] = useState(role?.isAdmin ?? false);

  return (
    <form
      className="role-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({ name, color, isAdmin });
      }}
    >
      <input
        type="color"
        value={color}
        onChange={(event) => setColor(event.target.value)}
        aria-label="Role color"
      />
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Role name"
        maxLength={50}
        required
        autoFocus
      />
      {canSetAdmin && (
        <label className="checkbox">
          <input type="checkbox" checked={isAdmin} onChange={(event) => setIsAdmin(event.target.checked)} />
          Admin
        </label>
      )}
      <button type="submit" className="btn primary">
        Save
      </button>
      <button type="button" className="btn ghost" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

function Roles({ data, setError }: SettingsProps) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const { isOwner } = data.permissions;
  const serverId = data.server.id;

  const save = async (input: { name: string; color: string; isAdmin: boolean }) => {
    setError("");
    try {
      if (editing === "new") await serversApi.createRole(serverId, input);
      else if (editing !== null) await serversApi.updateRole(serverId, editing, input);
      setEditing(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (role: Role) => {
    if (!confirm(`Delete the role "${role.name}"?`)) return;
    setError("");
    try {
      await serversApi.deleteRole(serverId, role.id);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="stack">
      <p className="muted small">
        Roles decide who can see private categories. Admin roles can manage the whole server.
      </p>

      <ul className="settings-list">
        {data.roles.map((role) =>
          editing === role.id ? (
            <li key={role.id}>
              <RoleForm role={role} canSetAdmin={isOwner} onSave={save} onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={role.id} className="settings-row">
              <span className="role-dot big" style={{ background: role.color }} />
              <strong style={{ color: role.color }}>{role.name}</strong>
              {role.isAdmin && <span className="tag">Admin</span>}
              <span className="grow" />
              {(isOwner || !role.isAdmin) && (
                <>
                  <button type="button" className="icon-btn" title="Edit role" onClick={() => setEditing(role.id)}>
                    <Icon name="gear" />
                  </button>
                  <button type="button" className="icon-btn danger" title="Delete role" onClick={() => void remove(role)}>
                    <Icon name="trash" />
                  </button>
                </>
              )}
            </li>
          ),
        )}
        {data.roles.length === 0 && editing !== "new" && <li className="muted">No roles yet.</li>}
      </ul>

      {editing === "new" ? (
        <RoleForm canSetAdmin={isOwner} onSave={save} onCancel={() => setEditing(null)} />
      ) : (
        <button type="button" className="btn primary align-start" onClick={() => setEditing("new")}>
          <Icon name="plus" /> Create role
        </button>
      )}
    </div>
  );
}

function Members({ data, setError }: SettingsProps) {
  const { user } = useAuth();
  const { isOwner } = data.permissions;
  const serverId = data.server.id;
  const adminRoleIds = new Set(data.roles.filter((role) => role.isAdmin).map((role) => role.id));

  const setRoles = async (userId: number, roleIds: number[]) => {
    setError("");
    try {
      await serversApi.setMemberRoles(serverId, userId, roleIds);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const kick = async (userId: number, username: string) => {
    if (!confirm(`Kick ${username} from the server?`)) return;
    setError("");
    try {
      await serversApi.kick(serverId, userId);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <ul className="settings-list">
      {data.members.map((member) => {
        const memberIsAdmin = member.roleIds.some((id) => adminRoleIds.has(id));
        const canKick = !member.isOwner && member.id !== user?.id && (isOwner || !memberIsAdmin);

        return (
          <li key={member.id} className="member-settings">
            <div className="settings-row">
              <Avatar id={member.id} name={member.username} size={30} />
              <strong>{member.username}</strong>
              {member.isOwner && <span className="tag">Owner</span>}
              <span className="grow" />
              {canKick && (
                <button
                  type="button"
                  className="btn danger small"
                  onClick={() => void kick(member.id, member.username)}
                >
                  Kick
                </button>
              )}
            </div>
            <RolePicker
              roles={data.roles}
              selected={member.roleIds}
              onChange={(roleIds) => void setRoles(member.id, roleIds)}
              isDisabled={(role) => role.isAdmin && !isOwner}
            />
          </li>
        );
      })}
    </ul>
  );
}

function ServerSettingsModal({ data, onClose }: { data: ServerDetails; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");

  return (
    <Modal title="Server settings" onClose={onClose} wide>
      <div className="segmented">
        {(["overview", "roles", "members"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? "active" : ""}
            onClick={() => {
              setTab(item);
              setError("");
            }}
          >
            {item === "overview" ? "Overview" : item === "roles" ? "Roles" : "Members"}
          </button>
        ))}
      </div>

      {error && <p className="alert error">{error}</p>}

      {tab === "overview" && <Overview data={data} setError={setError} />}
      {tab === "roles" && <Roles data={data} setError={setError} />}
      {tab === "members" && <Members data={data} setError={setError} />}
    </Modal>
  );
}

export default ServerSettingsModal;
