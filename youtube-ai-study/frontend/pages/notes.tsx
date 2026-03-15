import { useRouter } from "next/router";
import { AppShell } from "../components/layout/app-shell";
import { SectionCard, SkeletonLines } from "../components/feature-panels";
import { useLibraryVideo } from "../components/video/use-library-video";
import { StudyOutput } from "../components/study-output";

export default function NotesPage() {
  const router = useRouter();
  const { loading, error, video, options, videoId, setVideoId } = useLibraryVideo(
    typeof router.query.videoId === "string" ? router.query.videoId : undefined
  );

  return (
    <AppShell title="Notes" subtitle="Structured notes loaded from storage">
      <SectionCard title="Study Notes">
        <select value={videoId || ""} onChange={(e) => setVideoId(e.target.value)} className="select-input">
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        {loading ? <SkeletonLines count={6} /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {video ? (
          <div className="prose-block">
            <StudyOutput
              title={video.title}
              summary={video.summary}
              notes={video.notes}
              transcript={video.transcript}
              showTranscript={false}
              sourceUrl={video.youtube_url}
            />
          </div>
        ) : (
          <p className="muted">No notes available.</p>
        )}
      </SectionCard>
    </AppShell>
  );
}
