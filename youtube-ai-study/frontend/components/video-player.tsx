import { useEffect, useMemo, useRef } from "react";

export function VideoPlayer({ youtubeUrl, onReady }: { youtubeUrl: string; onReady?: (seek: (s: number) => void) => void }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastVideoIdRef = useRef<string>("");
  const videoId = useMemo(() => {
    try {
      const url = new URL(youtubeUrl);
      if (url.hostname.includes("youtu.be")) {
        return url.pathname.replace("/", "");
      }
      return url.searchParams.get("v") || "";
    } catch {
      return "";
    }
  }, [youtubeUrl]);

  const src = useMemo(() => {
    if (!videoId) return "";
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0`;
  }, [videoId]);

  useEffect(() => {
    if (!onReady || !videoId) return;
    if (lastVideoIdRef.current === videoId) return;
    lastVideoIdRef.current = videoId;
    const seek = (seconds: number) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true],
        }),
        "*"
      );
    };
    onReady(seek);
  }, [onReady, videoId]);

  if (!src) return <div className="video-player-placeholder">Video player will appear after analysis.</div>;

  return (
    <div className="video-player">
      <iframe
        ref={iframeRef}
        src={src}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
