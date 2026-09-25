import { useSocket } from "../../hooks/useSocket.ts";
import type { Member, Role } from "../../types/app.ts";
import { memberColor } from "../../utils/format.ts";
import Avatar from "../ui/Avatar.tsx";
import Icon from "../ui/Icon.tsx";

function MemberList({ members, roles }: { members: Member[]; roles: Role[] }) {
  const { online } = useSocket();
  const onlineMembers = members.filter((member) => online.has(member.id));
  const offlineMembers = members.filter((member) => !online.has(member.id));

  const renderGroup = (title: string, list: Member[], isOnline: boolean) =>
    list.length > 0 && (
      <>
        <p className="sidebar-section-title">
          {title} — {list.length}
        </p>
        <ul>
          {list.map((member) => (
            <li key={member.id} className={`member${isOnline ? "" : " offline"}`}>
              <Avatar
                id={member.id}
                name={member.username}
                size={32}
                status={isOnline ? "online" : "offline"}
              />
              <span style={{ color: memberColor(member, roles) }}>{member.username}</span>
              {member.isOwner && (
                <span className="owner-crown" title="Server owner">
                  <Icon name="crown" size={14} />
                </span>
              )}
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <aside className="member-list" aria-label="Members">
      {renderGroup("Online", onlineMembers, true)}
      {renderGroup("Offline", offlineMembers, false)}
    </aside>
  );
}

export default MemberList;
