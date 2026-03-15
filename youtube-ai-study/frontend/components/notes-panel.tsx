import type { Notes } from "../lib/types";
import { makeBullets } from "../lib/client/formatting";

function parseStructuredNotes(raw?: string) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    return null;
  }
  return null;
}

export function NotesPanel({ notes, summary }: { notes?: Notes | null; summary?: string }) {
  const overview = makeBullets(notes?.overview || summary || "", 8);
  const structured = parseStructuredNotes(notes?.detailed_explanation || "");
  const detailed = structured ? [] : makeBullets(notes?.detailed_explanation || "", 8);
  return (
    <div className="notes-panel">
      <section>
        <h4>Key Concepts</h4>
        <ul>
          {(notes?.main_concepts || []).map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <h4>Overview</h4>
        <ul>
          {overview.map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <h4>Detailed Notes</h4>
        {structured ? (
          <div className="notes-structured">
            {Object.entries(structured).map(([topic, content]) => (
              <div className="notes-topic" key={topic}>
                <h5>{topic.replace(/_/g, " ")}</h5>
                {typeof content === "string" ? (
                  <ul>
                    {makeBullets(content, 6).map((item, idx) => (
                      <li key={`${topic}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                ) : Array.isArray(content) ? (
                  <ul>
                    {content.map((item, idx) => (
                      <li key={`${topic}-${idx}`}>{String(item)}</li>
                    ))}
                  </ul>
                ) : (
                  <ul>
                    {Object.entries(content as Record<string, any>).map(([key, value]) => (
                      <li key={`${topic}-${key}`}>
                        <strong>{key.replace(/_/g, " ")}:</strong> {String(value)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <ul>
            {detailed.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
