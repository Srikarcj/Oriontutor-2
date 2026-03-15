import { useRouter } from "next/router";
import { AppShell } from "../components/layout/app-shell";
import { SectionCard, SkeletonLines } from "../components/feature-panels";
import { useLibraryVideo } from "../components/video/use-library-video";

export default function ChaptersPage() {
  const router = useRouter();
  const { loading, error, video, options, videoId, setVideoId } = useLibraryVideo(
    typeof router.query.videoId === "string" ? router.query.videoId : undefined
  );

  return (
    <AppShell title="Chapters" subtitle="Chapterized content for faster revision">
      <SectionCard title="Video Chapters">
        <select value={videoId || ""} onChange={(e) => setVideoId(e.target.value)} className="select-input">
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        {loading ? <SkeletonLines count={4} /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        <ul className="list-block">
          {(video?.chapters || []).map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      </SectionCard>
    </AppShell>
  );
}
