import { useState, type FormEvent } from "react";
import { serversApi } from "../../api/app.ts";
import type { Category, Role } from "../../types/app.ts";
import { errorMessage } from "../../utils/format.ts";
import Modal from "../ui/Modal.tsx";
import RolePicker from "./RolePicker.tsx";

interface CategoryModalProps {
  serverId: number;
  roles: Role[];
  category?: Category;
  onClose: () => void;
}

function CategoryModal({ serverId, roles, category, onClose }: CategoryModalProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [isPrivate, setIsPrivate] = useState(category?.isPrivate ?? false);
  const [roleIds, setRoleIds] = useState<number[]>(category?.roleIds ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const input = { name, isPrivate, roleIds };
      if (category) await serversApi.updateCategory(serverId, category.id, input);
      else await serversApi.createCategory(serverId, input);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!category || !confirm(`Delete "${category.name}" and every channel inside it?`)) return;
    try {
      await serversApi.deleteCategory(serverId, category.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal title={category ? "Edit category" : "Create category"} onClose={onClose}>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Category name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required autoFocus />
        </label>

        <div className="visibility-options">
          <label className={`visibility-option${!isPrivate ? " selected" : ""}`}>
            <input type="radio" name="visibility" checked={!isPrivate} onChange={() => setIsPrivate(false)} />
            <strong>Everyone</strong>
            <span>All members can see the channels in this category.</span>
          </label>
          <label className={`visibility-option${isPrivate ? " selected" : ""}`}>
            <input type="radio" name="visibility" checked={isPrivate} onChange={() => setIsPrivate(true)} />
            <strong>Only some roles</strong>
            <span>Only members with the roles you pick can see it.</span>
          </label>
        </div>

        {isPrivate && (
          <div className="form-field">
            <span>Roles that can see this category</span>
            <RolePicker roles={roles} selected={roleIds} onChange={setRoleIds} />
            <p className="muted small">The owner and admins can always see every category.</p>
          </div>
        )}

        {error && <p className="alert error">{error}</p>}

        <div className="modal-actions">
          {category && (
            <button type="button" className="btn danger push-left" onClick={handleDelete}>
              Delete category
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {category ? "Save changes" : "Create category"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CategoryModal;
