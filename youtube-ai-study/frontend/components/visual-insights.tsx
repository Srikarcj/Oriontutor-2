import { useMemo, useState } from "react";
import type { VisualInsight } from "../lib/types";

function formatTimestamp(value?: string) {
  return value || "--:--";
}

export function VisualInsights({
  insights,
  onSeek,
  question,
  onQuestionChange,
  onAsk,
  answer,
  loading,
}: {
  insights?: VisualInsight[] | null;
  onSeek?: (seconds: number) => void;
  question?: string;
  onQuestionChange?: (value: string) => void;
  onAsk?: () => void;
  answer?: string;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<VisualInsight | null>(null);

  const list = useMemo(() => {
    const data = Array.isArray(insights) ? insights : [];
    if (!query.trim()) return data;
    const term = query.toLowerCase();
    return data.filter((item) =>
      [item.title, item.visual_type, item.ai_explanation, ...(item.bullets || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [insights, query]);

  const pick = (item: VisualInsight) => {
    setSelected(item);
    if (onSeek && typeof item.seconds === "number") {
      onSeek(item.seconds);
    }
  };

  if (!list.length) {
    return (
      <div className="visual-empty">
        <p>No visual insights yet. Run analysis to generate key visual moments.</p>
      </div>
    );
  }

  return (
    <div className="visual-layout">
      <aside className="visual-timeline">
        <div className="visual-search">
          <input
            type="text"
            placeholder="Search diagrams, slides, code..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="visual-moments">
          {list.map((item, idx) => (
            <button key={`${item.timestamp}-${idx}`} className="visual-card" onClick={() => pick(item)}>
              <img src={item.image_url || "/favicon.ico"} alt={item.title || item.visual_type || "visual"} />
              <div>
                <span className="visual-time">{formatTimestamp(item.timestamp)}</span>
                <h5>{item.title || item.visual_type || "Key Moment"}</h5>
                <p>{item.visual_type}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>
      <section className="visual-detail">
        <h4>{selected?.title || "Select a visual moment"}</h4>
        {selected ? (
          <>
            <div className="visual-meta">
              <span>{formatTimestamp(selected.timestamp)}</span>
              <span>{selected.visual_type}</span>
              {selected.key_moment ? <span className="visual-badge">Key Idea</span> : null}
            </div>
            <p>{selected.ai_explanation || "Explanation will appear after analysis."}</p>
            {selected.bullets && selected.bullets.length ? (
              <ul>
                {selected.bullets.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p>Click a moment on the left to view details and jump to the timestamp.</p>
        )}
        {typeof onAsk === "function" ? (
          <div className="visual-ask">
            <h5>Ask about a timestamp</h5>
            <input
              type="text"
              placeholder="What happens at 03:45?"
              value={question || ""}
              onChange={(e) => onQuestionChange && onQuestionChange(e.target.value)}
            />
            <button onClick={onAsk} disabled={!question || loading}>
              {loading ? "Analyzing..." : "Ask Visual Insight"}
            </button>
            <div className="visual-answer">
              {loading ? "Generating insight..." : answer || "Visual answers will appear here."}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
