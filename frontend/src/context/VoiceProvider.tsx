import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AudioStream } from "../components/voice/MediaElements.tsx";
import { useSocket } from "../hooks/useSocket.ts";
import type { VoiceParticipant } from "../types/app.ts";
import { VoiceContext, type VoiceChannelInfo } from "./VoiceContext.ts";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

interface PeerEntry {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  screenSenders: RTCRtpSender[];
  queue: Promise<void>;
  pendingCandidates: RTCIceCandidateInit[];
  watchdog: number;
}

interface SignalData {
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface JoinResponse {
  ok: boolean;
  error?: string;
  peers?: string[];
  participants?: VoiceParticipant[];
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();

  const [channel, setChannel] = useState<VoiceChannelInfo | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream[]>>({});
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const peers = useRef(new Map<string, PeerEntry>());
  const micStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const channelRef = useRef<VoiceChannelInfo | null>(null);
  const mutedRef = useRef(false);
  const deafenedRef = useRef(false);

  const applyMicState = useCallback((isMuted: boolean) => {
    micStream.current?.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }, []);

  const setVoiceFlags = useCallback(
    (nextMuted: boolean, nextDeafened: boolean) => {
      mutedRef.current = nextMuted;
      deafenedRef.current = nextDeafened;
      setMuted(nextMuted);
      setDeafened(nextDeafened);
      applyMicState(nextMuted);
      if (channelRef.current) {
        socket?.emit("voice:update", { muted: nextMuted, deafened: nextDeafened });
      }
    },
    [applyMicState, socket],
  );

  const closePeer = useCallback((socketId: string) => {
    const entry = peers.current.get(socketId);
    if (!entry) return;
    window.clearInterval(entry.watchdog);
    entry.pc.close();
    peers.current.delete(socketId);
    setRemoteStreams((current) => {
      const next = { ...current };
      delete next[socketId];
      return next;
    });
  }, []);

  const createPeer = useCallback(
    (remoteId: string, initiator: boolean): PeerEntry | null => {
      if (!socket?.id) return null;

      const existing = peers.current.get(remoteId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const entry: PeerEntry = {
        pc,
        polite: socket.id > remoteId,
        makingOffer: false,
        ignoreOffer: false,
        screenSenders: [],
        queue: Promise.resolve(),
        pendingCandidates: [],
        watchdog: 0,
      };
      peers.current.set(remoteId, entry);

      const signal = (data: SignalData) => {
        socket.emit("voice:signal", { to: remoteId, data });
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) signal({ candidate: candidate.toJSON() });
      };

      pc.onnegotiationneeded = async () => {
        try {
          entry.makingOffer = true;
          await pc.setLocalDescription();
          if (pc.localDescription) signal({ description: pc.localDescription.toJSON() });
        } catch (err) {
          console.error(err);
        } finally {
          entry.makingOffer = false;
        }
      };

      pc.ontrack = ({ track, streams }) => {
        const stream = streams[0] ?? new MediaStream([track]);
        setRemoteStreams((current) => {
          const list = current[remoteId] ?? [];
          const others = list.filter((item) => item.id !== stream.id);
          return { ...current, [remoteId]: [...others, stream] };
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") pc.restartIce();
      };

      let stuckChecks = 0;
      entry.watchdog = window.setInterval(() => {
        const stuck =
          pc.remoteDescription !== null &&
          pc.signalingState === "stable" &&
          ["new", "checking", "disconnected", "failed"].includes(pc.iceConnectionState);
        stuckChecks = stuck ? stuckChecks + 1 : 0;
        if (stuckChecks >= 2 && !entry.polite) {
          stuckChecks = 0;
          pc.restartIce();
        }
      }, 3000);

      const mic = micStream.current;
      if (mic) {
        mic.getTracks().forEach((track) => pc.addTrack(track, mic));
      } else if (initiator) {
        pc.addTransceiver("audio", { direction: "recvonly" });
      }

      const screen = screenStream.current;
      if (screen) {
        entry.screenSenders = screen.getTracks().map((track) => pc.addTrack(track, screen));
      }

      return entry;
    },
    [socket],
  );

  const handleSignal = useCallback(
    (from: string, data: SignalData) => {
      const entry = peers.current.get(from) ?? createPeer(from, false);
      if (!entry || !socket) return;
      const { pc } = entry;

      const process = async () => {
        if (pc.signalingState === "closed") return;

        if (data.description) {
          const description = data.description;
          const collision =
            description.type === "offer" &&
            (entry.makingOffer || pc.signalingState !== "stable");
          entry.ignoreOffer = !entry.polite && collision;
          if (entry.ignoreOffer) return;

          await pc.setRemoteDescription(description);

          const pending = entry.pendingCandidates.splice(0);
          for (const candidate of pending) {
            await pc.addIceCandidate(candidate).catch(() => undefined);
          }

          if (description.type === "offer") {
            await pc.setLocalDescription();
            if (pc.localDescription) {
              socket.emit("voice:signal", {
                to: from,
                data: { description: pc.localDescription.toJSON() },
              });
            }
          }
        } else if (data.candidate) {
          if (!pc.remoteDescription) {
            entry.pendingCandidates.push(data.candidate);
            return;
          }
          try {
            await pc.addIceCandidate(data.candidate);
          } catch (err) {
            if (!entry.ignoreOffer) throw err;
          }
        }
      };

      entry.queue = entry.queue.then(process).catch((err) => console.error(err));
    },
    [createPeer, socket],
  );

  const cleanup = useCallback(() => {
    peers.current.forEach((entry) => {
      window.clearInterval(entry.watchdog);
      entry.pc.close();
    });
    peers.current.clear();
    micStream.current?.getTracks().forEach((track) => track.stop());
    micStream.current = null;
    screenStream.current?.getTracks().forEach((track) => track.stop());
    screenStream.current = null;
    channelRef.current = null;
    setLocalScreenStream(null);
    setRemoteStreams({});
    setParticipants([]);
    setChannel(null);
    setHasMic(false);
  }, []);

  const leave = useCallback(() => {
    if (channelRef.current) {
      socket?.emit("voice:leave");
    }
    cleanup();
  }, [cleanup, socket]);

  const join = useCallback(
    async (info: VoiceChannelInfo) => {
      if (!socket || channelRef.current?.id === info.id) return;

      leave();
      setError("");
      setConnecting(true);

      let mic: MediaStream | null = null;
      try {
        mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        mic = null;
      }

      micStream.current = mic;
      setHasMic(mic !== null);

      const response = (await socket
        .timeout(10000)
        .emitWithAck("voice:join", { channelId: info.id })
        .catch(() => ({ ok: false, error: "The server didn't answer. Try again." }))) as JoinResponse;

      setConnecting(false);

      if (!response.ok) {
        mic?.getTracks().forEach((track) => track.stop());
        micStream.current = null;
        setHasMic(false);
        setError(response.error ?? "Couldn't join the voice channel");
        return;
      }

      channelRef.current = info;
      setChannel(info);
      setParticipants(response.participants ?? []);

      const startMuted = mutedRef.current || mic === null;
      setVoiceFlags(startMuted, deafenedRef.current);

      for (const peerId of response.peers ?? []) {
        createPeer(peerId, true);
      }
    },
    [createPeer, leave, setVoiceFlags, socket],
  );

  const toggleMute = useCallback(() => {
    if (!mutedRef.current || micStream.current || !channelRef.current) {
      const nextMuted = !mutedRef.current;
      setVoiceFlags(nextMuted, nextMuted ? deafenedRef.current : false);
    }
  }, [setVoiceFlags]);

  const toggleDeafen = useCallback(() => {
    const nextDeafened = !deafenedRef.current;
    const nextMuted = nextDeafened ? true : channelRef.current && !micStream.current ? true : false;
    setVoiceFlags(nextMuted, nextDeafened);
  }, [setVoiceFlags]);

  const stopScreenShare = useCallback(() => {
    const stream = screenStream.current;
    if (!stream) return;

    peers.current.forEach((entry) => {
      entry.screenSenders.forEach((sender) => {
        try {
          entry.pc.removeTrack(sender);
        } catch {
          return;
        }
      });
      entry.screenSenders = [];
    });

    stream.getTracks().forEach((track) => track.stop());
    screenStream.current = null;
    setLocalScreenStream(null);
    socket?.emit("voice:update", { screenStreamId: null });
  }, [socket]);

  const startScreenShare = useCallback(async () => {
    if (!channelRef.current || screenStream.current) return;

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen sharing isn't supported in this browser");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      });
    } catch {
      return;
    }

    if (!channelRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    screenStream.current = stream;
    setLocalScreenStream(stream);
    stream.getVideoTracks()[0]?.addEventListener("ended", stopScreenShare);

    socket?.emit("voice:update", { screenStreamId: stream.id });

    peers.current.forEach((entry) => {
      entry.screenSenders = stream.getTracks().map((track) => entry.pc.addTrack(track, stream));
    });
  }, [socket, stopScreenShare]);

  useEffect(() => {
    if (!socket) return;

    const onPeerLeft = ({ socketId }: { socketId: string }) => {
      closePeer(socketId);
    };

    const onSignal = ({ from, data }: { from: string; data: SignalData }) => {
      if (channelRef.current) handleSignal(from, data);
    };

    const onParticipants = ({
      channelId,
      participants: list,
    }: {
      channelId: number;
      participants: VoiceParticipant[];
    }) => {
      if (channelRef.current?.id === channelId) setParticipants(list);
    };

    const onKicked = () => {
      cleanup();
      setError("You no longer have access to that voice channel");
    };

    const onDisconnect = () => {
      if (channelRef.current) cleanup();
    };

    socket.on("voice:peer-left", onPeerLeft);
    socket.on("voice:signal", onSignal);
    socket.on("voice:participants", onParticipants);
    socket.on("voice:kicked", onKicked);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("voice:peer-left", onPeerLeft);
      socket.off("voice:signal", onSignal);
      socket.off("voice:participants", onParticipants);
      socket.off("voice:kicked", onKicked);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket, closePeer, handleSignal, cleanup]);

  useEffect(() => cleanup, [cleanup]);

  const value = useMemo(
    () => ({
      channel,
      participants,
      remoteStreams,
      localScreenStream,
      mySocketId: socket?.id ?? null,
      muted,
      deafened,
      hasMic,
      connecting,
      error,
      join,
      leave,
      toggleMute,
      toggleDeafen,
      startScreenShare,
      stopScreenShare,
    }),
    [
      channel,
      participants,
      remoteStreams,
      localScreenStream,
      socket,
      muted,
      deafened,
      hasMic,
      connecting,
      error,
      join,
      leave,
      toggleMute,
      toggleDeafen,
      startScreenShare,
      stopScreenShare,
    ],
  );

  return (
    <VoiceContext.Provider value={value}>
      {children}
      <div hidden>
        {Object.entries(remoteStreams).flatMap(([socketId, streams]) =>
          streams
            .filter((stream) => stream.getAudioTracks().length > 0)
            .map((stream) => (
              <AudioStream key={`${socketId}-${stream.id}`} stream={stream} muted={deafened} />
            )),
        )}
      </div>
    </VoiceContext.Provider>
  );
}
