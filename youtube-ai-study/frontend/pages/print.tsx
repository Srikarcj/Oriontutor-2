import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { VideoDetailResponse } from "../lib/client/api";
import { StudyOutput } from "../components/study-output";

export default function PrintPage() {
  const router = useRouter();
  const videoId = typeof router.query.videoId === "string" ? router.query.videoId : "";
  const [video, setVideo] = useState<VideoDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!videoId) return;
    let usedCache = false;
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("print_video");
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as VideoDetailResponse;
          if (parsed?.id === videoId) {
            setVideo(parsed);
            setLoading(false);
            usedCache = true;
          }
        } catch {
          // ignore cache parse errors
        }
      }
    }
    if (!usedCache) {
      setLoading(true);
    }
    (async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = (await res.json()) as VideoDetailResponse;
        setVideo(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [videoId]);

  useEffect(() => {
    if (!loading && video) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [loading, video]);

  if (loading) {
    return <div className="print-shell">Preparing PDF...</div>;
  }

  if (!video) {
    return <div className="print-shell">Unable to load video.</div>;
  }

  return (
    <div className="print-shell">
      <div className="print-header">
        <div className="print-title">{video.title}</div>
        <div className="print-subtitle">Premium study notes export</div>
      </div>
      <StudyOutput
        title=""
        summary={video.summary}
        notes={video.notes}
        transcript={video.transcript}
        showTranscript={true}
        numberedSections={true}
        sourceUrl={video.youtube_url}
      />
    </div>
  );
}
