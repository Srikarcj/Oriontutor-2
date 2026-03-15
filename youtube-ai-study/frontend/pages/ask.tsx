import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { Send, Brain } from "lucide-react";
import { Spinner } from "../components/ui";
import { AppShell } from "../components/layout/app-shell";
import { SectionCard } from "../components/feature-panels";
import { Button, Textarea } from "../components/ui";
import { fetchJson } from "../lib/client/api";
import { useLibraryVideo } from "../components/video/use-library-video";
import { AnswerOutput } from "../components/answer-output";
import { VideoPlayer } from "../components/video-player";

export default function AskPage() {
  const router = useRouter();
  const { videoId, setVideoId, options, video } = useLibraryVideo(
    typeof router.query.videoId === "string" ? router.query.videoId : undefined
  );
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!videoId || !question.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer("");
    const streamUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/qa/stream?video_id=${encodeURIComponent(videoId)}&question=${encodeURIComponent(question)}`;
    if (typeof window !== "undefined" && "EventSource" in window) {
      const es = new EventSource(streamUrl);
      let buffer = "";
      let received = false;
      es.onmessage = (event) => {
        if (event.data === "[DONE]") {
          es.close();
          setLoading(false);
          setQuestion("");
          return;
        }
        received = true;
        buffer += event.data;
        setAnswer(buffer);
      };
      es.onerror = () => {
        es.close();
        if (!received) {
          fetchJson<{ answer: string }>("/api/qa/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ video_id: videoId, question }),
          })
            .then((data) => setAnswer(data.answer))
            .catch((err: any) => setError(err.message || "Unable to ask question."))
            .finally(() => setLoading(false));
          return;
        }
        setLoading(false);
      };
      return;
    }

    try {
      const data = await fetchJson<{ answer: string }>("/api/qa/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, question }),
      });
      setAnswer(data.answer);
      setQuestion("");
    } catch (err: any) {
      setError(err.message || "Unable to ask question.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="" subtitle="">
      <SectionCard title="Ask AI">
        <select value={videoId || ""} onChange={(e) => setVideoId(e.target.value)} className="select-input">
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        {video ? <VideoPlayer youtubeUrl={video.youtube_url} /> : null}
        <form onSubmit={submit} className="stack-sm">
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask your question" />
          <Button variant="default" size="lg" type="submit" disabled={loading || !videoId}>
            {loading ? (
              <>
                <Spinner />
                <span className="ml-2">Thinking...</span>
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Ask&nbsp;AI
              </>
            )}
          </Button>
        </form>
        <div className="answer-box">
          {loading ? (
            <div className="thinking-row">
              <span className="thinking-dots">
                <span />
                <span />
                <span />
              </span>
              <span>Analyzing and composing a response...</span>
            </div>
          ) : answer ? (
            <AnswerOutput answer={answer} />
          ) : (
            "Answers will appear here. Ask a question to get started."
          )}
        </div>
        <div className="suggested-questions">
          <button onClick={() => setQuestion("Summarize the key concepts.")}>Summarize the key concepts</button>
          <button onClick={() => setQuestion("What happens at 03:45?")}>What happens at 03:45?</button>
          <button onClick={() => setQuestion("Explain the main idea in simple terms.")}>Explain the main idea in simple terms</button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </SectionCard>
    </AppShell>
  );
}
