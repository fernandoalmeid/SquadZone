import { useState, type FormEvent } from "react";
import { serversApi } from "../../api/app.ts";
import type { Category, Channel, ChannelType } from "../../types/app.ts";
import { errorMessage } from "../../utils/format.ts";
import Icon from "../ui/Icon.tsx";
import Modal from "../ui/Modal.tsx";

interface ChannelModalProps {
  serverId: number;
  categories: Category[];
  channel?: Channel;
  defaultCategoryId?: number | null;
  onClose: () => void;
  onCreated: (channelId: number) => void;
}

function ChannelModal({
  serverId,
  categories,
  channel,
  defaultCategoryId,
  onClose,
  onCreated,
}: ChannelModalProps) {
  const [name, setName] = useState(channel?.name ?? "");
  const [type, setType] = useState<ChannelType>(channel?.type ?? "text");
  const [categoryId, setCategoryId] = useState<number | null>(
    channel ? channel.categoryId : (defaultCategoryId ?? categories[0]?.id ?? null),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (channel) {
        await serversApi.updateChannel(serverId, channel.id, { name, categoryId });
        onClose();
      } else {
        const result = await serversApi.createChannel(serverId, { name, type, categoryId });
        onClose();
        onCreated(result.id);
      }
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!channel || !confirm(`Delete the channel "${channel.name}"?`)) return;
    try {
      await serversApi.deleteChannel(serverId, channel.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal title={channel ? "Edit channel" : "Create channel"} onClose={onClose}>
      <form className="stack" onSubmit={handleSubmit}>
        {!channel && (
          <div className="visibility-options">
            <label className={`visibility-option${type === "text" ? " selected" : ""}`}>
              <input type="radio" name="type" checked={type === "text"} onChange={() => setType("text")} />
              <strong>
                <Icon name="hash" size={16} /> Text
              </strong>
              <span>Send messages and talk in chat.</span>
            </label>
            <label className={`visibility-option${type === "voice" ? " selected" : ""}`}>
              <input type="radio" name="type" checked={type === "voice"} onChange={() => setType("voice")} />
              <strong>
                <Icon name="speaker" size={16} /> Voice
              </strong>
              <span>Talk and share your screen.</span>
            </label>
          </div>
        )}

        <label className="form-field">
          <span>Channel name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={type === "text" ? "new-channel" : "Hangout"}
            maxLength={100}
            required
            autoFocus
          />
        </label>

        <label className="form-field">
          <span>Category</span>
          <select
            value={categoryId ?? ""}
            onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">No category (everyone can see it)</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isPrivate ? " (private)" : ""}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="alert error">{error}</p>}

        <div className="modal-actions">
          {channel && (
            <button type="button" className="btn danger push-left" onClick={handleDelete}>
              Delete channel
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {channel ? "Save changes" : "Create channel"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ChannelModal;
