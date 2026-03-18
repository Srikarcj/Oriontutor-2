import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/layout/app-shell";

export default function StudyMaterialsPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [materials, setMaterials] = useState<any[]>([]);
  const [tab, setTab] = useState<"documents" | "videos">("documents");
  const [documents, setDocuments] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docQuestion, setDocQuestion] = useState("");
  const [docAnswer, setDocAnswer] = useState("");
  const [docSources, setDocSources] = useState<any[]>([]);
  const [docStreaming, setDocStreaming] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [videoResult, setVideoResult] = useState<any | null>(null);
  const [videoQuestion, setVideoQuestion] = useState("");
  const [videoAnswer, setVideoAnswer] = useState("");
  const [videoSources, setVideoSources] = useState<any[]>([]);
  const [videoError, setVideoError] = useState<string | null>(null);
  const selectedCourseSlug = selected && selected !== "all" ? selected : "";

  const getVideoId = (value: string) => {
    if (!value) return "";
    const raw = String(value).trim();
    // If it's already a video id
    if (/^[A-Za-z0-9_-]{6,64}$/.test(raw)) return raw;
    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "");
      if (host === "youtube.com") {
        const v = url.searchParams.get("v");
        if (v && /^[A-Za-z0-9_-]{6,64}$/.test(v)) return v;
      }
      if (host === "youtu.be") {
        const candidate = url.pathname.split("/").filter(Boolean)[0] || "";
        if (candidate && /^[A-Za-z0-9_-]{6,64}$/.test(candidate)) return candidate;
      }
      const fallback = url.pathname.split("/").filter(Boolean).pop() || "";
      if (fallback && /^[A-Za-z0-9_-]{6,64}$/.test(fallback)) return fallback;
    } catch {
      // not a URL, fall through
    }
    return "";
  };

  const buildThumbnail = (videoId: string) =>
    videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : "";

  useEffect(() => {
    fetch("/api/courses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const items = data?.items || [];
        setCourses(items);
        if (!selected) setSelected("all");
      });
  }, []);

  useEffect(() => {
    if (!selectedCourseSlug) return;
    fetch(`/api/courses/content?course_slug=${encodeURIComponent(selectedCourseSlug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setMaterials(data?.materials || []);
      });
  }, [selectedCourseSlug]);

  useEffect(() => {
    const docsUrl = selectedCourseSlug
      ? `/api/knowledge/documents?course_slug=${encodeURIComponent(selectedCourseSlug)}`
      : "/api/knowledge/documents";
    fetch(docsUrl)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setDocuments(data?.items || []))
      .catch(async (res) => {
        setDocuments([]);
        try {
          const text = typeof res?.text === "function" ? await res.text() : "";
          setDocError(text || "Failed to load documents");
        } catch {
          setDocError("Failed to load documents");
        }
      });

    const videosUrl = selectedCourseSlug
      ? `/api/knowledge/videos?course_slug=${encodeURIComponent(selectedCourseSlug)}`
      : "/api/knowledge/videos";
    fetch(videosUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setVideos(data?.items || []))
      .catch(() => setVideos([]));
  }, [selectedCourseSlug]);

  const pdfIds = useMemo(() => documents.map((doc) => doc.id).filter(Boolean), [documents]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setDocError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (selectedCourseSlug) form.append("course_slug", selectedCourseSlug);
      const res = await fetch("/api/pdf/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      await res.json();
      const docsRes = await fetch(
        selectedCourseSlug ? `/api/knowledge/documents?course_slug=${encodeURIComponent(selectedCourseSlug)}` : "/api/knowledge/documents"
      );
      const docsData = docsRes.ok ? await docsRes.json() : null;
      setDocuments(docsData?.items || []);
    } catch (err: any) {
      setDocError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    await fetch(`/api/knowledge/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
    const docsRes = await fetch(
      selectedCourseSlug ? `/api/knowledge/documents?course_slug=${encodeURIComponent(selectedCourseSlug)}` : "/api/knowledge/documents"
    );
    const docsData = docsRes.ok ? await docsRes.json() : null;
    setDocuments(docsData?.items || []);
  };

  const streamAnswer = async (
    question: string,
    videoId: string | undefined,
    setAnswer: (value: string) => void,
    setStreaming: (value: boolean) => void
  ) => {
    const params = new URLSearchParams();
    params.set("question", question);
    if (selectedCourseSlug) params.set("course_slug", selectedCourseSlug);
    if (videoId) params.set("video_id", videoId);
    const source = new EventSource(`/api/knowledge/stream?${params.toString()}`);
    setStreaming(true);
    setAnswer("");
    return new Promise<void>((resolve) => {
      source.onmessage = (event) => {
        setAnswer((prev) => prev + event.data);
      };
      source.addEventListener("done", () => {
        source.close();
        setStreaming(false);
        resolve();
      });
    });
  };

  const askDocuments = async (question: string) => {
    if (!question.trim()) return;
    setDocError(null);
    await streamAnswer(question, undefined, setDocAnswer, setDocStreaming);
    const res = await fetch("/api/knowledge/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        course_slug: selectedCourseSlug || undefined,
        pdf_document_ids: pdfIds,
        video_id: undefined,
        conversation,
      }),
    });
    if (!res.ok) {
      setDocError(await res.text());
      return;
    }
    const data = await res.json();
    setDocAnswer(data.answer || "");
    setDocSources(data.sources || []);
    setConversation((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: data.answer }]);
  };

  const askVideo = async (question: string, videoId?: string) => {
    if (!question.trim() || !videoId) return;
    setVideoError(null);
    await streamAnswer(question, videoId, setVideoAnswer, setDocStreaming);
    const res = await fetch("/api/knowledge/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        course_slug: selectedCourseSlug || undefined,
        pdf_document_ids: pdfIds,
        video_id: videoId,
        conversation,
      }),
    });
    if (!res.ok) {
      setVideoError(await res.text());
      return;
    }
    const data = await res.json();
    setVideoAnswer(data.answer || "");
    setVideoSources(data.sources || []);
    setConversation((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: data.answer }]);
  };

  const handleVideoProcess = async () => {
    if (!videoUrl.trim()) return;
    setVideoProcessing(true);
    setVideoError(null);
    try {
      const res = await fetch("/api/video/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: videoUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVideoResult(data);
      await fetch("/api/knowledge/videos/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: data.video_id,
          title: data?.notes?.title || `Lecture ${data.video_id}`,
          youtube_url: videoUrl,
          course_slug: selectedCourseSlug || undefined,
        }),
      });
      const listRes = await fetch(
        selectedCourseSlug ? `/api/knowledge/videos?course_slug=${encodeURIComponent(selectedCourseSlug)}` : "/api/knowledge/videos"
      );
      const listData = listRes.ok ? await listRes.json() : null;
      setVideos(listData?.items || []);
    } catch (err: any) {
      setVideoError(err?.message || "Video processing failed");
    } finally {
      setVideoProcessing(false);
    }
  };

  return (
    <AppShell title="AI Knowledge Lab" subtitle="Analyze documents and lectures with AI-powered study tools.">
      <section className="knowledge-header">
        <div>
          <h2>AI Knowledge Lab</h2>
          <p>Analyze documents and lectures with AI-powered study tools.</p>
        </div>
        <label className="knowledge-select">
          Course
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="all">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.slug || course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="knowledge-tabs">
        <button className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}>
          Document Analyzer
        </button>
        <button className={tab === "videos" ? "active" : ""} onClick={() => setTab("videos")}>
          Video Analyzer
        </button>
      </div>

      {tab === "documents" ? (
        <div className="knowledge-grid">
          <div className="knowledge-panel">
            <h3>Upload Documents</h3>
            <div
              className={`upload-drop ${uploading ? "busy" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleUpload(file);
              }}
            >
              <div className="upload-icon" aria-hidden="true">
                PDF
              </div>
              <p>Drag & drop PDF here</p>
              <p className="upload-sub">or browse files</p>
              <label className="upload-btn">
                Upload PDF
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
              </label>
              {uploading ? <span className="upload-status">Indexing...</span> : null}
            </div>

            <div className="knowledge-list">
              <h4>Knowledge Base</h4>
              {!documents.length ? <p>No PDFs uploaded yet.</p> : null}
              {documents.map((doc) => (
                <div key={doc.id} className="knowledge-item">
                  <div>
                    <strong>{doc.name}</strong>
                    <span>{doc.indexed_at ? "Indexed" : "Processing"}</span>
                  </div>
                  <button className="ghost-btn" onClick={() => handleDeleteDoc(doc.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="knowledge-panel wide">
            <h3>Ask AI About Your Documents</h3>
            <div className="knowledge-ask">
              <input
                value={docQuestion}
                onChange={(event) => setDocQuestion(event.target.value)}
                placeholder="Ask anything about your documents or videos…"
              />
              <button onClick={() => askDocuments(docQuestion)}>Ask AI</button>
            </div>
            {docStreaming ? <p className="answer-streaming">Generating answer...</p> : null}
            {docAnswer ? (
              <div className="answer-card">
                <h4>AI Answer</h4>
                <p>{docAnswer}</p>
              </div>
            ) : null}
            {docSources.length ? (
              <div className="sources-card">
                <h4>Sources</h4>
                {docSources.map((source: any, idx: number) => (
                  <div key={`${source.file_name}-${idx}`} className="source-item">
                    <span>{source.file_name || "Document"}</span>
                    <em>{source.page_number ? `Page ${source.page_number}` : "Source"}</em>
                  </div>
                ))}
              </div>
            ) : null}
            {docError ? <p className="pdf-error">{docError}</p> : null}
            <div className="followup">
              <input
                value={docQuestion}
                onChange={(event) => setDocQuestion(event.target.value)}
                placeholder="Ask anything about your documents or videos…"
              />
              <button onClick={() => askDocuments(docQuestion)}>Ask follow-up</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="knowledge-grid">
          <div className="knowledge-panel">
            <h3>Video Analyzer</h3>
            <div className="knowledge-ask">
              <input
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="Paste a YouTube lecture link to analyze the video…"
              />
              <button onClick={handleVideoProcess} disabled={videoProcessing}>
                {videoProcessing ? "Processing..." : "Analyze"}
              </button>
            </div>
            {videoError ? <p className="pdf-error">{videoError}</p> : null}
            {videoResult ? (
              <div className="answer-card">
                {(() => {
                  const vid = getVideoId(videoUrl) || getVideoId(videoResult?.video_id || "");
                  return vid ? <img className="video-thumb" src={buildThumbnail(vid)} alt="Video thumbnail" /> : null;
                })()}
                <h4>Video Summary</h4>
                <p>{videoResult.summary}</p>
                <h4>Key Concepts</h4>
                <ul className="easy-list">
                  {(videoResult?.notes?.main_concepts || []).map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h4>Lecture Notes</h4>
                <p>{videoResult?.notes?.overview}</p>
                <h4>Flashcards</h4>
                <ul className="easy-list">
                  {(videoResult?.flashcards || []).slice(0, 5).map((card: any, idx: number) => (
                    <li key={`${card.question}-${idx}`}>{card.question}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="knowledge-list">
              <h4>Saved Lectures</h4>
              {!videos.length ? <p>No videos saved yet.</p> : null}
              {videos.map((item) => (
                <div key={item.id} className="knowledge-item">
                  {(() => {
                    const vidFromUrl = getVideoId(item.metadata?.youtube_url || "");
                    const vid = vidFromUrl || (item.ref_id && getVideoId(item.ref_id)) || "";
                    return vid ? <img className="video-thumb small" src={buildThumbnail(vid)} alt="Video thumbnail" /> : null;
                  })()}
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.metadata?.course_slug || "Course"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="knowledge-panel wide">
            <h3>Ask Questions About This Video</h3>
            <div className="knowledge-ask">
              <input
                value={videoQuestion}
                onChange={(event) => setVideoQuestion(event.target.value)}
                placeholder="Ask anything about your documents or videos…"
              />
              <button
                onClick={() => {
                  setVideoAnswer("");
                  setVideoSources([]);
                  askVideo(videoQuestion, videoResult?.video_id);
                }}
                disabled={!videoResult?.video_id}
              >
                Ask AI
              </button>
            </div>
            {videoAnswer ? (
              <div className="answer-card">
                <h4>AI Answer</h4>
                <p>{videoAnswer}</p>
              </div>
            ) : null}
            {videoSources.length ? (
              <div className="sources-card">
                <h4>Sources</h4>
                {videoSources.map((source: any, idx: number) => (
                  <div key={`${source.title}-${idx}`} className="source-item">
                    <span>{source.title || "Lecture"}</span>
                    {source.timestamp ? (
                      <button
                        className="ghost-btn"
                        onClick={() => {
                          const parts = String(source.timestamp).split(":");
                          const mins = Number(parts[0] || 0);
                          const secs = Number(parts[1] || 0);
                          const total = mins * 60 + secs;
                          if (videoUrl) {
                            const url = videoUrl.includes("?") ? `${videoUrl}&t=${total}s` : `${videoUrl}?t=${total}s`;
                            window.open(url, "_blank");
                          }
                        }}
                      >
                        {source.timestamp}
                      </button>
                    ) : (
                      <em>Timestamp</em>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <section className="materials-grid">
        {materials.map((item) => (
          <div key={item.id} className="material-card">
            <strong>{item.title}</strong>
            <span>{item.material_type}</span>
            {item.description ? <p>{item.description}</p> : null}
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer" className="material-link">
                Open material
              </a>
            ) : null}
          </div>
        ))}
      </section>
    </AppShell>
  );
}
