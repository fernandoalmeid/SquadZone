import type { Role } from "../../types/app.ts";

interface RolePickerProps {
  roles: Role[];
  selected: number[];
  onChange: (roleIds: number[]) => void;
  isDisabled?: (role: Role) => boolean;
}

function RolePicker({ roles, selected, onChange, isDisabled }: RolePickerProps) {
  if (roles.length === 0) {
    return <p className="muted small">This server has no roles yet. Create them in server settings.</p>;
  }

  const toggle = (roleId: number) => {
    onChange(
      selected.includes(roleId) ? selected.filter((id) => id !== roleId) : [...selected, roleId],
    );
  };

  return (
    <div className="role-picker">
      {roles.map((role) => (
        <label
          key={role.id}
          className={`role-chip${selected.includes(role.id) ? " selected" : ""}`}
          style={{ ["--role-color" as string]: role.color }}
        >
          <input
            type="checkbox"
            checked={selected.includes(role.id)}
            disabled={isDisabled?.(role)}
            onChange={() => toggle(role.id)}
          />
          <span className="role-dot" />
          {role.name}
        </label>
      ))}
    </div>
  );
}

export default RolePicker;
