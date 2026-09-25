import { useState, type FormEvent, type ReactNode } from "react";
import { friendsApi } from "../api/app.ts";
import SidebarFooter from "../components/app/SidebarFooter.tsx";
import Avatar from "../components/ui/Avatar.tsx";
import Icon from "../components/ui/Icon.tsx";
import { useFriends } from "../hooks/useFriends.ts";
import { useSocket } from "../hooks/useSocket.ts";
import type { BasicUser } from "../types/app.ts";
import { errorMessage } from "../utils/format.ts";

type Tab = "online" | "all" | "pending" | "add";

function AddFriend() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);

    try {
      const response = await friendsApi.add(username.trim());
      setResult({
        type: "success",
        text:
          response.status === "accepted"
            ? `You and ${response.username} are now friends.`
            : `Friend request sent to ${response.username}.`,
      });
      setUsername("");
    } catch (err) {
      setResult({ type: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="add-friend">
      <h2>Add friend</h2>
      <p className="muted">You can add friends with their SquadZone username.</p>

      <form className={`add-friend-form ${result?.type ?? ""}`} onSubmit={handleSubmit}>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Type a username"
          maxLength={50}
          autoFocus
        />
        <button type="submit" className="btn primary" disabled={busy || !username.trim()}>
          Send friend request
        </button>
      </form>

      {result && <p className={`add-friend-result ${result.type}`}>{result.text}</p>}
    </section>
  );
}

interface FriendRowProps {
  user: BasicUser;
  online: boolean;
  subtitle: string;
  children: ReactNode;
}

function FriendRow({ user, online, subtitle, children }: FriendRowProps) {
  return (
    <li className="friend-row">
      <Avatar id={user.id} name={user.username} size={36} status={online ? "online" : "offline"} />
      <div className="friend-row-text">
        <strong>{user.username}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="friend-row-actions">{children}</div>
    </li>
  );
}

function Friends() {
  const { friends, incoming, outgoing, loading } = useFriends();
  const { online } = useSocket();
  const [tab, setTab] = useState<Tab>("online");
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");

  const run = async (action: () => Promise<unknown>) => {
    setActionError("");
    try {
      await action();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const matches = (user: BasicUser) =>
    user.username.toLowerCase().includes(search.trim().toLowerCase());

  const onlineFriends = friends.filter((friend) => online.has(friend.id));
  const visibleFriends = (tab === "online" ? onlineFriends : friends).filter(matches);
  const pendingCount = incoming.length + outgoing.length;

  const removeButton = (user: BasicUser, label: string) => (
    <button
      type="button"
      className="round-btn danger"
      title={label}
      onClick={() => {
        if (label !== "Remove friend" || confirm(`Remove ${user.username} from your friends?`)) {
          void run(() => friendsApi.remove(user.id));
        }
      }}
    >
      <Icon name="x" />
    </button>
  );

  const renderList = () => {
    if (tab === "add") return <AddFriend />;

    if (loading) return <p className="empty-state">Loading friends…</p>;

    if (tab === "pending") {
      const incomingList = incoming.filter(matches);
      const outgoingList = outgoing.filter(matches);
      if (incomingList.length + outgoingList.length === 0) {
        return <p className="empty-state">There are no pending friend requests.</p>;
      }
      return (
        <>
          <h3 className="list-title">Pending — {incomingList.length + outgoingList.length}</h3>
          <ul className="friend-list">
            {incomingList.map((user) => (
              <FriendRow key={user.id} user={user} online={online.has(user.id)} subtitle="Incoming friend request">
                <button
                  type="button"
                  className="round-btn success"
                  title="Accept"
                  onClick={() => void run(() => friendsApi.accept(user.id))}
                >
                  <Icon name="check" />
                </button>
                {removeButton(user, "Decline")}
              </FriendRow>
            ))}
            {outgoingList.map((user) => (
              <FriendRow key={user.id} user={user} online={online.has(user.id)} subtitle="Outgoing friend request">
                {removeButton(user, "Cancel request")}
              </FriendRow>
            ))}
          </ul>
        </>
      );
    }

    if (visibleFriends.length === 0) {
      return (
        <p className="empty-state">
          {friends.length === 0
            ? "You don't have friends yet. Add someone by their username."
            : tab === "online"
              ? "None of your friends are online right now."
              : "No friends match your search."}
        </p>
      );
    }

    return (
      <>
        <h3 className="list-title">
          {tab === "online" ? "Online" : "All friends"} — {visibleFriends.length}
        </h3>
        <ul className="friend-list">
          {visibleFriends.map((user) => {
            const isOnline = online.has(user.id);
            return (
              <FriendRow key={user.id} user={user} online={isOnline} subtitle={isOnline ? "Online" : "Offline"}>
                {removeButton(user, "Remove friend")}
              </FriendRow>
            );
          })}
        </ul>
      </>
    );
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <strong>Friends</strong>
        </div>
        <div className="sidebar-scroll">
          <button type="button" className={`nav-item${tab !== "add" ? " active" : ""}`} onClick={() => setTab("online")}>
            <Icon name="users" />
            Friends
          </button>
          <p className="sidebar-section-title">Your friends</p>
          {friends.map((friend) => (
            <div key={friend.id} className="sidebar-friend">
              <Avatar
                id={friend.id}
                name={friend.username}
                size={30}
                status={online.has(friend.id) ? "online" : "offline"}
              />
              <span>{friend.username}</span>
            </div>
          ))}
        </div>
        <SidebarFooter />
      </aside>

      <main className="main">
        <header className="main-header">
          <span className="main-header-title">
            <Icon name="users" />
            Friends
          </span>
          <nav className="tabs">
            <button type="button" className={tab === "online" ? "active" : ""} onClick={() => setTab("online")}>
              Online
            </button>
            <button type="button" className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>
              All
            </button>
            <button type="button" className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>
              Pending
              {incoming.length > 0 && <span className="badge">{incoming.length}</span>}
            </button>
            <button
              type="button"
              className={`add-tab${tab === "add" ? " active" : ""}`}
              onClick={() => setTab("add")}
            >
              Add friend
            </button>
          </nav>
        </header>

        <div className="main-content friends-content">
          {tab !== "add" && (pendingCount > 0 || friends.length > 0) && (
            <label className="search">
              <Icon name="search" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
            </label>
          )}
          {actionError && <p className="alert error">{actionError}</p>}
          {renderList()}
        </div>
      </main>
    </>
  );
}

export default Friends;
