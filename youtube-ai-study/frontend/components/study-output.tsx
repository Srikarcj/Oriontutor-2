import type { Notes } from "../lib/types";
import {
  buildSummaryBullets,
  buildTranscriptBlocks,
  highlightKeywords,
  makeBullets,
} from "../lib/client/formatting";

function parseStructuredDetails(raw?: string) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, any>;
  } catch {
    return null;
  }
  return null;
}

function HighlightedText({ text }: { text: string }) {
  const parts = highlightKeywords(text);
  return (
    <>
      {parts.map((part, idx) =>
        part.bold ? <strong key={idx}>{part.value}</strong> : <span key={idx}>{part.value}</span>
      )}
    </>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return <p className="muted">No content available.</p>;
  return (
    <ul className="study-bullets">
      {items.map((item, idx) => (
        <li key={`${item}-${idx}`}>
          <HighlightedText text={item} />
        </li>
      ))}
    </ul>
  );
}

function Paragraphs({ text }: { text: string }) {
  const paragraphs = makeBullets(text, 8);
  if (!paragraphs.length) return <p className="muted">No details available.</p>;
  return (
    <div className="study-paragraphs">
      {paragraphs.map((para, idx) => (
        <p key={`${para}-${idx}`}>
          <HighlightedText text={para} />
        </p>
      ))}
    </div>
  );
}

export function StudyOutput({
  title,
  summary,
  notes,
  transcript,
  showTranscript = true,
  numberedSections = false,
  sourceUrl,
}: {
  title?: string;
  summary?: string;
  notes?: Notes | null;
  transcript?: string;
  showTranscript?: boolean;
  numberedSections?: boolean;
  sourceUrl?: string;
}) {
  const summaryBullets = buildSummaryBullets(summary || "", notes);
  const transcriptBlocks = buildTranscriptBlocks(transcript || "");
  const structuredDetails = parseStructuredDetails(notes?.detailed_explanation || "");
  const summaryLabel = numberedSections ? "SECTION 1 — Video Summary" : "Video Summary";
  const notesLabel = numberedSections ? "SECTION 2 — Detailed Notes" : "Detailed Notes";
  const transcriptLabel = numberedSections ? "SECTION 3 — Full Transcript" : "Full Transcript";

  return (
    <div className="study-output">
      {title ? <h3 className="study-title">{title}</h3> : null}
      {sourceUrl ? (
        <a className="study-source" href={sourceUrl} target="_blank" rel="noreferrer">
          Source video
        </a>
      ) : null}

      <section className="study-section">
        <div className="study-section-title">{summaryLabel}</div>
        <BulletList items={summaryBullets} />
      </section>

      <section className="study-section">
        <div className="study-section-title">{notesLabel}</div>
        <div className="study-subsection">
          <div className="study-subtitle">Overview</div>
          <BulletList items={makeBullets(notes?.overview || summary || "", 8)} />
        </div>
        {notes?.main_concepts?.length ? (
          <div className="study-subsection">
            <div className="study-subtitle">Main Concepts</div>
            <BulletList items={notes.main_concepts.map(String)} />
          </div>
        ) : null}
        {structuredDetails ? (
          <div className="study-subsection">
            <div className="study-subtitle">Explanation</div>
            {Object.entries(structuredDetails).map(([topic, detail]) => (
              <div key={topic} className="study-topic">
                <div className="study-topic-title">{topic.replace(/_/g, " ")}</div>
                {typeof detail === "string" ? (
                  <BulletList items={makeBullets(detail, 6)} />
                ) : Array.isArray(detail) ? (
                  <BulletList items={detail.map(String)} />
                ) : (
                  <BulletList items={Object.entries(detail as Record<string, any>).map(([k, v]) => `${k}: ${v}`)} />
                )}
              </div>
            ))}
          </div>
        ) : notes?.detailed_explanation ? (
          <div className="study-subsection">
            <div className="study-subtitle">Explanation</div>
            <BulletList items={makeBullets(notes.detailed_explanation, 8)} />
          </div>
        ) : null}
        {notes?.examples?.length ? (
          <div className="study-subsection">
            <div className="study-subtitle">Examples</div>
            <BulletList items={notes.examples.map(String)} />
          </div>
        ) : null}
        {notes?.key_takeaways?.length ? (
          <div className="study-subsection">
            <div className="study-subtitle">Key Takeaways</div>
            <BulletList items={notes.key_takeaways.map(String)} />
          </div>
        ) : null}
      </section>

      {showTranscript ? (
        <section className="study-section">
          <div className="study-section-title">{transcriptLabel}</div>
          {transcriptBlocks.length ? (
            <div className="study-transcript">
              {transcriptBlocks.map((block, idx) => (
                <p key={`${block}-${idx}`}>{block}</p>
              ))}
            </div>
          ) : (
            <p className="muted">Transcript is not available yet.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
