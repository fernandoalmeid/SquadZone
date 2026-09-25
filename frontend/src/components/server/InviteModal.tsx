import { useState } from "react";
import { serversApi } from "../../api/app.ts";
import type { ServerDetails } from "../../types/app.ts";
import Icon from "../ui/Icon.tsx";
import Modal from "../ui/Modal.tsx";

function InviteModal({ data, onClose }: { data: ServerDetails; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(data.server.inviteCode).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal title={`Invite friends to ${data.server.name}`} onClose={onClose}>
      <p className="muted">Send this code to a friend. They can join with the + button on the left.</p>
      <div className="copy-field">
        <code>{data.server.inviteCode}</code>
        <button type="button" className="btn primary" onClick={copy}>
          <Icon name={copied ? "check" : "copy"} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {data.permissions.canManage && (
        <button
          type="button"
          className="btn ghost"
          onClick={() => void serversApi.newInvite(data.server.id)}
        >
          <Icon name="refresh" /> Generate a new code
        </button>
      )}
    </Modal>
  );
}

export default InviteModal;
