import { useRouter } from "next/router";
import { AppShell } from "../components/layout/app-shell";
import { SectionCard, SkeletonLines } from "../components/feature-panels";
import { useLibraryVideo } from "../components/video/use-library-video";
import { StudyOutput } from "../components/study-output";
import { MindMap } from "../components/mind-map";
import { Flashcards } from "../components/flashcards";
import { NotesPanel } from "../components/notes-panel";
import { VideoPlayer } from "../components/video-player";
import { Button } from "../components/ui";

export default function SummarizePage() {
  const router = useRouter();
  const { loading, error, video, options, videoId, setVideoId } = useLibraryVideo(
    typeof router.query.videoId === "string" ? router.query.videoId : undefined
  );

  async function downloadPdf() {
    if (!video?.pdf_url) return;
    const url = video.pdf_url.startsWith("/")
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${video.pdf_url}`
      : video.pdf_url;
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${video.title || "study-notes"}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <AppShell title="" subtitle="">
      <SectionCard title="Summarize">
        <select value={videoId || ""} onChange={(e) => setVideoId(e.target.value)} className="select-input">
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        {loading ? <SkeletonLines count={6} /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {video ? (
          <div className="summarize-grid">
            <VideoPlayer youtubeUrl={video.youtube_url} />
            <div className="summarize-actions">
              <Button variant="secondary" size="sm" onClick={downloadPdf} disabled={!video.pdf_url}>Download PDF</Button>
            </div>
            <StudyOutput
              title={video.title}
              summary={video.summary}
              notes={video.notes}
              transcript={video.transcript}
              showTranscript={false}
              sourceUrl={video.youtube_url}
            />
            <NotesPanel notes={video.notes} summary={video.summary} />
            <MindMap notes={video.notes} summary={video.summary} mindmap={video.mindmap as any} />
            <Flashcards
              notes={video.notes}
              summary={video.summary}
              transcript={video.transcript}
              flashcards={video.flashcards as Array<{ question: string; answer: string }> | undefined}
            />
          </div>
        ) : (
          <p className="muted">No video selected.</p>
        )}
      </SectionCard>
    </AppShell>
  );
}
