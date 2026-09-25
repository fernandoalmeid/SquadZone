import { useRef } from "react";
import { useVoice } from "../../hooks/useVoice.ts";
import type { Channel, VoiceParticipant } from "../../types/app.ts";
import Avatar from "../ui/Avatar.tsx";
import Icon from "../ui/Icon.tsx";
import { VideoStream } from "./MediaElements.tsx";

interface VoiceChannelViewProps {
  channel: Channel;
  serverId: number;
  serverName: string;
  preview: VoiceParticipant[];
}

function Tile({ participant, stream, isMe }: { participant: VoiceParticipant; stream: MediaStream | null; isMe: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className={`tile${stream ? " sharing" : ""}`}>
      {stream ? (
        <>
          <VideoStream stream={stream} className="tile-video" />
          <button
            type="button"
            className="icon-btn tile-fullscreen"
            title="Full screen"
            onClick={() => void ref.current?.requestFullscreen()}
          >
            <Icon name="maximize" />
          </button>
        </>
      ) : (
        <Avatar id={participant.userId} name={participant.username} size={72} />
      )}
      <span className="tile-name">
        {participant.username}
        {isMe && " (you)"}
        {participant.deafened ? (
          <Icon name="headphonesOff" size={14} />
        ) : (
          participant.muted && <Icon name="micOff" size={14} />
        )}
      </span>
      {stream && <span className="live-pill tile-live">Live</span>}
    </div>
  );
}

function VoiceChannelView({ channel, serverId, serverName, preview }: VoiceChannelViewProps) {
  const voice = useVoice();
  const connectedHere = voice.channel?.id === channel.id;

  const join = () =>
    void voice.join({ id: channel.id, name: channel.name, serverId, serverName });

  if (!connectedHere) {
    return (
      <div className="voice-lobby">
        <span className="voice-lobby-icon">
          <Icon name="speaker" size={34} />
        </span>
        <h2>{channel.name}</h2>
        <p className="muted">
          {preview.length === 0
            ? "No one is here yet."
            : `${preview.map((p) => p.username).join(", ")} ${preview.length === 1 ? "is" : "are"} in this channel.`}
        </p>
        {voice.error && <p className="alert error">{voice.error}</p>}
        <button type="button" className="btn primary big" onClick={join} disabled={voice.connecting}>
          {voice.connecting ? "Connecting…" : "Join voice"}
        </button>
      </div>
    );
  }

  const sharing = voice.localScreenStream !== null;

  const streamFor = (participant: VoiceParticipant, isMe: boolean) => {
    if (isMe) return voice.localScreenStream;
    if (!participant.screenStreamId) return null;
    return (
      voice.remoteStreams[participant.socketId]?.find(
        (stream) => stream.id === participant.screenStreamId && stream.getVideoTracks().length > 0,
      ) ?? null
    );
  };

  return (
    <div className="voice-room">
      <div className="tiles">
        {voice.participants.map((participant) => {
          const isMe = participant.socketId === voice.mySocketId;
          return (
            <Tile
              key={participant.socketId}
              participant={participant}
              stream={streamFor(participant, isMe)}
              isMe={isMe}
            />
          );
        })}
      </div>

      {!voice.hasMic && <p className="muted small center">No microphone found, so you joined muted. You can still listen and share your screen.</p>}
      {voice.error && <p className="alert error center">{voice.error}</p>}

      <div className="voice-controls">
        <button
          type="button"
          className={`control-btn${voice.muted ? " off" : ""}`}
          onClick={voice.toggleMute}
          title={voice.muted ? "Unmute" : "Mute"}
        >
          <Icon name={voice.muted ? "micOff" : "mic"} size={22} />
        </button>
        <button
          type="button"
          className={`control-btn${voice.deafened ? " off" : ""}`}
          onClick={voice.toggleDeafen}
          title={voice.deafened ? "Undeafen" : "Deafen"}
        >
          <Icon name={voice.deafened ? "headphonesOff" : "headphones"} size={22} />
        </button>
        <button
          type="button"
          className={`control-btn${sharing ? " active" : ""}`}
          onClick={sharing ? voice.stopScreenShare : () => void voice.startScreenShare()}
          title={sharing ? "Stop sharing" : "Share your screen"}
        >
          <Icon name="screen" size={22} />
        </button>
        <button type="button" className="control-btn leave" onClick={voice.leave} title="Disconnect">
          <Icon name="phoneOff" size={22} />
        </button>
      </div>
    </div>
  );
}

export default VoiceChannelView;
