import { useEffect, useMemo, useState } from "react";
import { fetchJson, type LibraryResponse, type VideoDetailResponse } from "../../lib/client/api";

export function useLibraryVideo(initialId?: string) {
  const [library, setLibrary] = useState<LibraryResponse["items"]>([]);
  const [videoId, setVideoId] = useState<string | null>(initialId || null);
  const [video, setVideo] = useState<VideoDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<LibraryResponse>("/api/library")
      .then((res) => {
        setLibrary(res.items);
        setVideoId((prev) => {
          const firstId = res.items[0]?.id || null;
          if (!prev) return firstId;
          const stillExists = res.items.some((item) => item.id === prev);
          return stillExists ? prev : firstId;
        });
      })
      .catch((e: any) => setError(e.message || "Failed to load library"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!videoId) {
      setVideo(null);
      setError(null);
      return;
    }
    const valid = library.some((item) => item.id === videoId);
    if (!valid) {
      setVideo(null);
      setError(null);
      return;
    }

    fetchJson<VideoDetailResponse>(`/api/videos/${videoId}`)
      .then((data) => {
        setVideo(data);
        setError(null);
      })
      .catch((e: any) => setError(e.message || "Failed to load video"));
  }, [videoId, loading, library]);

  const options = useMemo(
    () => library.map((item) => ({ id: item.id, label: item.title || item.youtube_url })),
    [library]
  );

  return {
    loading,
    error,
    video,
    videoId,
    setVideoId,
    options,
  };
}
