import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { serversApi } from "../../api/app.ts";
import { useAuth } from "../../hooks/useAuth.ts";
import { errorMessage } from "../../utils/format.ts";
import Modal from "../ui/Modal.tsx";

interface CreateServerModalProps {
  onClose: () => void;
  onDone: () => Promise<void>;
}

function CreateServerModal({ onClose, onDone }: CreateServerModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(`${user?.username ?? "My"}'s server`);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const result = mode === "create" ? await serversApi.create(name) : await serversApi.join(code);
      await onDone();
      onClose();
      navigate(`/servers/${result.server.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={mode === "create" ? "Create a server" : "Join a server"} onClose={onClose}>
      <div className="segmented">
        <button
          type="button"
          className={mode === "create" ? "active" : ""}
          onClick={() => setMode("create")}
        >
          Create
        </button>
        <button
          type="button"
          className={mode === "join" ? "active" : ""}
          onClick={() => setMode("join")}
        >
          Join with invite
        </button>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        {mode === "create" ? (
          <label className="form-field">
            <span>Server name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
              autoFocus
            />
          </label>
        ) : (
          <label className="form-field">
            <span>Invite code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. a1B2c3D4"
              required
              autoFocus
            />
          </label>
        )}

        {error && <p className="alert error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {mode === "create" ? "Create server" : "Join server"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateServerModal;
