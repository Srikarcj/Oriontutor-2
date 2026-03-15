import { useRouter } from "next/router";
import { AppShell } from "../components/layout/app-shell";
import { SectionCard, SkeletonLines } from "../components/feature-panels";
import { useLibraryVideo } from "../components/video/use-library-video";
import { StudyOutput } from "../components/study-output";
import { Button } from "../components/ui";

export default function FullTranscriptPage() {
  const router = useRouter();
  const { loading, error, video, options, videoId, setVideoId } = useLibraryVideo(
    typeof router.query.videoId === "string" ? router.query.videoId : undefined
  );

  return (
    <AppShell title="Full Transcript" subtitle="Summary, notes, and full transcript in one place">
      <SectionCard
        title="Complete Study View"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!videoId) return;
              if (!video?.pdf_url) return;
              const url = video.pdf_url.startsWith("/")
                ? `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${video.pdf_url}`
                : video.pdf_url;
              fetch(url)
                .then((res) => res.blob())
                .then((blob) => {
                  const blobUrl = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = blobUrl;
                  link.download = `${video.title || "study-notes"}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  URL.revokeObjectURL(blobUrl);
                })
                .catch(() => null);
            }}
            disabled={!video?.pdf_url}
          >
            DOWNLOAD PDF
          </Button>
        }
      >
        <select value={videoId || ""} onChange={(e) => setVideoId(e.target.value)} className="select-input">
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        {loading ? <SkeletonLines count={8} /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {video ? (
          <div className="prose-block">
            <StudyOutput
              title={video.title}
              summary={video.summary}
              notes={video.notes}
              transcript={video.transcript}
              showTranscript={true}
              sourceUrl={video.youtube_url}
            />
          </div>
        ) : (
          <p className="muted">No video selected.</p>
        )}
      </SectionCard>
    </AppShell>
  );
}
