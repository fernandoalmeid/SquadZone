import { useEffect, useRef, useState, type FormEvent } from "react";
import { messagesApi } from "../../api/app.ts";
import { useSocket } from "../../hooks/useSocket.ts";
import type { Channel, Member, Message, Role } from "../../types/app.ts";
import { errorMessage, formatTime, memberColor } from "../../utils/format.ts";
import Avatar from "../ui/Avatar.tsx";
import Icon from "../ui/Icon.tsx";

interface TextChannelViewProps {
  channel: Channel;
  members: Member[];
  roles: Role[];
}

const GROUP_WINDOW = 5 * 60 * 1000;

function TextChannelView({ channel, members, roles }: TextChannelViewProps) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const addMessage = (message: Message) => {
    setMessages((current) =>
      current.some((item) => item.id === message.id) ? current : [...current, message],
    );
  };

  useEffect(() => {
    let active = true;
    messagesApi
      .list(channel.id)
      .then((result) => {
        if (active) setMessages(result.messages);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [channel.id]);

  useEffect(() => {
    if (!socket) return;

    const subscribe = () => socket.emit("channel:subscribe", { channelId: channel.id });
    const onMessage = (message: Message) => {
      if (message.channelId === channel.id) addMessage(message);
    };

    subscribe();
    socket.on("connect", subscribe);
    socket.on("message:new", onMessage);

    return () => {
      socket.off("connect", subscribe);
      socket.off("message:new", onMessage);
      socket.emit("channel:unsubscribe");
    };
  }, [socket, channel.id]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setDraft("");
    setError("");
    try {
      const result = await messagesApi.send(channel.id, content);
      addMessage(result.message);
    } catch (err) {
      setDraft(content);
      setError(errorMessage(err));
    }
  };

  const colorFor = (userId: number) => {
    const member = members.find((item) => item.id === userId);
    return member ? memberColor(member, roles) : undefined;
  };

  return (
    <div className="chat">
      <div className="messages" ref={listRef}>
        <div className="chat-intro">
          <span className="chat-intro-icon">
            <Icon name="hash" size={30} />
          </span>
          <h2>Welcome to #{channel.name}</h2>
          <p className="muted">This is the start of the #{channel.name} channel.</p>
        </div>

        {loading && <p className="empty-state">Loading messages…</p>}

        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const grouped =
            previous !== undefined &&
            previous.author.id === message.author.id &&
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_WINDOW;

          return grouped ? (
            <div key={message.id} className="message grouped">
              <p>{message.content}</p>
            </div>
          ) : (
            <div key={message.id} className="message">
              <Avatar id={message.author.id} name={message.author.username} size={40} />
              <div>
                <div className="message-meta">
                  <strong style={{ color: colorFor(message.author.id) }}>{message.author.username}</strong>
                  <time>{formatTime(message.createdAt)}</time>
                </div>
                <p>{message.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="alert error chat-error">{error}</p>}

      <form className="composer" onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message #${channel.name}`}
          maxLength={2000}
        />
        <button type="submit" className="icon-btn" disabled={!draft.trim()} title="Send">
          <Icon name="send" />
        </button>
      </form>
    </div>
  );
}

export default TextChannelView;
