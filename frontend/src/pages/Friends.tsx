import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { dmsApi, friendsApi } from "../api/app.ts";
import SidebarFooter from "../components/app/SidebarFooter.tsx";
import Avatar from "../components/ui/Avatar.tsx";
import Icon from "../components/ui/Icon.tsx";
import ProfileCard from "../components/ui/ProfileCard.tsx";
import { useFriends } from "../hooks/useFriends.ts";
import { useSocket } from "../hooks/useSocket.ts";
import type { BasicUser, DmChannel, Message } from "../types/app.ts";
import { errorMessage, formatTime } from "../utils/format.ts";

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
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Type a username" maxLength={50} autoFocus />
        <button type="submit" className="btn primary" disabled={busy || !username.trim()}>Send friend request</button>
      </form>
      {result && <p className={`add-friend-result ${result.type}`}>{result.text}</p>}
    </section>
  );
}

function FriendRow({ user, online, subtitle, onOpenProfile, children }: {
  user: BasicUser; online: boolean; subtitle: string; onOpenProfile: () => void; children: ReactNode;
}) {
  return (
    <li className="friend-row">
      <button type="button" className="friend-row-identity" onClick={onOpenProfile} title="View profile">
        <Avatar id={user.id} name={user.username} size={36} status={online ? "online" : "offline"} src={user.avatar} />
        <div className="friend-row-text">
          <strong>{user.username}</strong>
          <span>{subtitle}</span>
        </div>
      </button>
      <div className="friend-row-actions">{children}</div>
    </li>
  );
}

function DmView({ channel, online, onBack }: { channel: DmChannel; online: boolean; onBack: () => void }) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    dmsApi.messages(channel.id).then((r) => { if (active) setMessages(r.messages); })
      .catch((err) => { if (active) setError(errorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [channel.id]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (message: Message) => {
      if (message.channelId === channel.id) {
        setMessages((cur) => (cur.some((m) => m.id === message.id) ? cur : [...cur, message]));
      }
    };
    socket.on("dm:message", onMsg);
    return () => { socket.off("dm:message", onMsg); };
  }, [socket, channel.id]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    setError("");
    try {
      const { message } = await dmsApi.send(channel.id, content);
      setMessages((cur) => (cur.some((m) => m.id === message.id) ? cur : [...cur, message]));
    } catch (err) {
      setError(errorMessage(err));
      setDraft(content);
    }
  };

  return (
    <div className="chat dm-chat">
      <header className="main-header">
        <button type="button" className="icon-btn" onClick={onBack} title="Back"><Icon name="x" /></button>
        <button type="button" className="main-header-title dm-header-peer" onClick={() => setShowProfile(true)}>
          <Avatar id={channel.peer.id} name={channel.peer.username} size={28} status={online ? "online" : "offline"} src={channel.peer.avatar} />
          {channel.peer.username}
        </button>
      </header>
      <div className="messages" ref={listRef}>
        <div className="chat-intro">
          <Avatar id={channel.peer.id} name={channel.peer.username} size={64} src={channel.peer.avatar} />
          <h2>{channel.peer.username}</h2>
          <p className="muted">This is the beginning of your direct message history.</p>
        </div>
        {loading && <p className="empty-state">Loading messages…</p>}
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const grouped = previous && previous.author.id === message.author.id &&
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000;
          return (
            <div key={message.id} className={`message${grouped ? " grouped" : ""}`}>
              {!grouped && <Avatar id={message.author.id} name={message.author.username} size={40} src={message.author.avatar} />}
              <div>
                {!grouped && (
                  <div className="message-meta">
                    <strong>{message.author.username}</strong>
                    <time>{formatTime(message.createdAt)}</time>
                  </div>
                )}
                <p>{message.content}</p>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="alert error chat-error">{error}</p>}
      <form className="composer" onSubmit={(e) => void send(e)}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Message @${channel.peer.username}`} maxLength={2000} />
        <button type="submit" className="icon-btn" disabled={!draft.trim()} title="Send"><Icon name="send" /></button>
      </form>
      {showProfile && (
        <div className="sz-profile-overlay" onClick={() => setShowProfile(false)} role="presentation">
          <div onClick={(e) => e.stopPropagation()}>
            <ProfileCard user={channel.peer} online={online} onClose={() => setShowProfile(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Friends() {
  const { friends, incoming, outgoing, loading } = useFriends();
  const { online } = useSocket();
  const [tab, setTab] = useState<Tab>("online");
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const [dmChannel, setDmChannel] = useState<DmChannel | null>(null);
  const [dmList, setDmList] = useState<DmChannel[]>([]);
  const [profileUser, setProfileUser] = useState<BasicUser | null>(null);

  useEffect(() => {
    void dmsApi.list().then((r) => setDmList(r.channels)).catch(() => setDmList([]));
  }, [friends.length]);

  const run = async (action: () => Promise<unknown>) => {
    setActionError("");
    try { await action(); } catch (err) { setActionError(errorMessage(err)); }
  };

  const openDm = async (user: BasicUser) => {
    setActionError("");
    try {
      const { channel } = await dmsApi.open(user.id);
      setDmChannel(channel);
      setProfileUser(null);
      setDmList((cur) => (cur.some((c) => c.id === channel.id) ? cur : [channel, ...cur]));
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const matches = (user: BasicUser) => user.username.toLowerCase().includes(search.trim().toLowerCase());
  const onlineFriends = friends.filter((f) => online.has(f.id));
  const visibleFriends = (tab === "online" ? onlineFriends : friends).filter(matches);

  const removeButton = (user: BasicUser, label: string) => (
    <button type="button" className="round-btn danger" title={label} onClick={() => {
      if (label !== "Remove friend" || confirm(`Remove ${user.username} from your friends?`)) {
        void run(() => friendsApi.remove(user.id));
      }
    }}><Icon name="x" /></button>
  );

  const messageButton = (user: BasicUser) => (
    <button type="button" className="round-btn" title="Message" onClick={() => void openDm(user)}>
      <Icon name="send" />
    </button>
  );

  const renderList = () => {
    if (tab === "add") return <AddFriend />;
    if (loading) return <p className="empty-state">Loading friends…</p>;
    if (tab === "pending") {
      const incomingList = incoming.filter(matches);
      const outgoingList = outgoing.filter(matches);
      if (incomingList.length + outgoingList.length === 0) return <p className="empty-state">There are no pending friend requests.</p>;
      return (
        <>
          <h3 className="list-title">Pending — {incomingList.length + outgoingList.length}</h3>
          <ul className="friend-list">
            {incomingList.map((user) => (
              <FriendRow key={user.id} user={user} online={online.has(user.id)} subtitle="Incoming friend request" onOpenProfile={() => setProfileUser(user)}>
                <button type="button" className="round-btn success" title="Accept" onClick={() => void run(() => friendsApi.accept(user.id))}><Icon name="check" /></button>
                {removeButton(user, "Decline")}
              </FriendRow>
            ))}
            {outgoingList.map((user) => (
              <FriendRow key={user.id} user={user} online={online.has(user.id)} subtitle="Outgoing friend request" onOpenProfile={() => setProfileUser(user)}>
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
          {friends.length === 0 ? "You don't have friends yet. Add someone by their username."
            : tab === "online" ? "None of your friends are online right now." : "No friends match your search."}
        </p>
      );
    }
    return (
      <>
        <h3 className="list-title">{tab === "online" ? "Online" : "All friends"} — {visibleFriends.length}</h3>
        <ul className="friend-list">
          {visibleFriends.map((user) => {
            const isOnline = online.has(user.id);
            return (
              <FriendRow key={user.id} user={user} online={isOnline} subtitle={isOnline ? "Online" : "Offline"} onOpenProfile={() => setProfileUser(user)}>
                {messageButton(user)}
                {removeButton(user, "Remove friend")}
              </FriendRow>
            );
          })}
        </ul>
      </>
    );
  };

  if (dmChannel) {
    return (
      <>
        <aside className="sidebar">
          <div className="sidebar-header"><strong>Direct Messages</strong></div>
          <div className="sidebar-scroll">
            <button type="button" className="nav-item" onClick={() => setDmChannel(null)}><Icon name="users" />Friends</button>
            <p className="sidebar-section-title">Conversations</p>
            {dmList.map((ch) => (
              <button key={ch.id} type="button" className={`sidebar-friend dm-sidebar-item${ch.id === dmChannel.id ? " active" : ""}`} onClick={() => setDmChannel(ch)}>
                <Avatar id={ch.peer.id} name={ch.peer.username} size={30} status={online.has(ch.peer.id) ? "online" : "offline"} src={ch.peer.avatar} />
                <span>{ch.peer.username}</span>
              </button>
            ))}
          </div>
          <SidebarFooter />
        </aside>
        <main className="main">
          <DmView channel={dmChannel} online={online.has(dmChannel.peer.id)} onBack={() => setDmChannel(null)} />
        </main>
      </>
    );
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header"><strong>Friends</strong></div>
        <div className="sidebar-scroll">
          <button type="button" className={`nav-item${tab !== "add" ? " active" : ""}`} onClick={() => setTab("online")}><Icon name="users" />Friends</button>
          {dmList.length > 0 && (
            <>
              <p className="sidebar-section-title">Direct messages</p>
              {dmList.map((ch) => (
                <button key={ch.id} type="button" className="sidebar-friend dm-sidebar-item" onClick={() => setDmChannel(ch)}>
                  <Avatar id={ch.peer.id} name={ch.peer.username} size={30} status={online.has(ch.peer.id) ? "online" : "offline"} src={ch.peer.avatar} />
                  <span>{ch.peer.username}</span>
                </button>
              ))}
            </>
          )}
          <p className="sidebar-section-title">Your friends</p>
          {friends.map((friend) => (
            <button key={friend.id} type="button" className="sidebar-friend dm-sidebar-item" onClick={() => void openDm(friend)}>
              <Avatar id={friend.id} name={friend.username} size={30} status={online.has(friend.id) ? "online" : "offline"} src={friend.avatar} />
              <span>{friend.username}</span>
            </button>
          ))}
        </div>
        <SidebarFooter />
      </aside>

      <main className="main">
        <header className="main-header">
          <span className="main-header-title"><Icon name="users" />Friends</span>
          <nav className="tabs">
            <button type="button" className={tab === "online" ? "active" : ""} onClick={() => setTab("online")}>Online</button>
            <button type="button" className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All</button>
            <button type="button" className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>
              Pending
              {incoming.length > 0 && <span className="badge">{incoming.length}</span>}
            </button>
            <button type="button" className={`add-tab${tab === "add" ? " active" : ""}`} onClick={() => setTab("add")}>Add friend</button>
          </nav>
        </header>

        <div className="main-content friends-content">
          {tab !== "add" && (incoming.length + outgoing.length > 0 || friends.length > 0) && (
            <label className="search"><Icon name="search" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" /></label>
          )}
          {actionError && <p className="alert error">{actionError}</p>}
          {renderList()}
        </div>
      </main>

      {profileUser && (
        <div className="sz-profile-overlay" onClick={() => setProfileUser(null)} role="presentation">
          <div onClick={(e) => e.stopPropagation()}>
            <ProfileCard
              user={profileUser}
              online={online.has(profileUser.id)}
              onClose={() => setProfileUser(null)}
              onMessage={() => void openDm(profileUser)}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default Friends;
