import { useEffect, useRef } from "react";

export function AudioStream({ stream, muted }: { stream: MediaStream; muted: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.srcObject = stream;
    element.play().catch(() => undefined);
  }, [stream]);

  return <audio ref={ref} autoPlay muted={muted} />;
}

export function VideoStream({
  stream,
  className,
}: {
  stream: MediaStream;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.srcObject = stream;
    element.play().catch(() => undefined);
  }, [stream]);

  return <video ref={ref} className={className} autoPlay playsInline muted />;
}
