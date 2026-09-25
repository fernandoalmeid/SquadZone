import { NavLink } from "react-router-dom";
import type { ServerSummary } from "../../types/app.ts";
import { initials } from "../../utils/format.ts";
import Icon from "../ui/Icon.tsx";
import Logo from "../ui/Logo.tsx";

interface ServerRailProps {
  servers: ServerSummary[];
  onAddServer: () => void;
}

function ServerRail({ servers, onAddServer }: ServerRailProps) {
  return (
    <nav className="server-rail" aria-label="Servers">
      <NavLink to="/friends" className="rail-item home" title="Friends">
        <Logo />
      </NavLink>

      <div className="rail-separator" />

      <div className="rail-list">
        {servers.map((server) => (
          <NavLink
            key={server.id}
            to={`/servers/${server.id}`}
            className="rail-item"
            title={server.name}
          >
            {initials(server.name)}
          </NavLink>
        ))}

        <button
          type="button"
          className="rail-item add"
          title="Add a server"
          onClick={onAddServer}
        >
          <Icon name="plus" size={22} />
        </button>
      </div>
    </nav>
  );
}

export default ServerRail;
