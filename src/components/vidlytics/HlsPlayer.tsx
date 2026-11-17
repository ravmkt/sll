import { useEffect, useRef } from "react";
import Hls from "hls.js";

type Props = { src: string; poster?: string; className?: string; autoPlay?: boolean; muted?: boolean };

export default function HlsPlayer({ src, poster, className, autoPlay = false, muted = false }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }
    if (!Hls.isSupported()) return;

    const hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(video);
    return () => hls.destroy();
  }, [src]);

  return (
    <video
      ref={ref}
      poster={poster}
      controls
      playsInline
      autoPlay={autoPlay}
      muted={muted}
      className={className}
    />
  );
}
