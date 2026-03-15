import { useState } from "react";
import { AppShell } from "../components/layout/app-shell";

export default function PdfQaPage() {
  const [docId, setDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/pdf/upload", { method: "POST", body: formData });
    const data = await res.json();
    setDocId(data.id);
    setDocName(data.name);
  }

  async function askQuestion() {
    if (!docId || !question.trim()) return;
    setLoading(true);
    const res = await fetch("/api/pdf/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: docId, question }),
    });
    const data = await res.json();
    setAnswer(data.answer);
    setCitations(Array.isArray(data.citations) ? data.citations : []);
    setLoading(false);
  }

  return (
    <AppShell title="PDF Question Answering" subtitle="Upload a PDF and ask questions with citations">
      <section className="pdf-qa">
        <div className="pdf-upload">
          <h3>Upload PDF</h3>
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
          {docName ? <p>Uploaded: {docName}</p> : <p>No document uploaded.</p>}
        </div>
        <div className="pdf-ask">
          <h3>Ask a question</h3>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about a topic, definition, or section"
          />
          <button className="cta-primary small" onClick={askQuestion} disabled={!docId || loading}>
            {loading ? "Searching..." : "Ask"}
          </button>
          {answer ? (
            <div className="pdf-answer">
              <strong>Answer</strong>
              <p>{answer}</p>
              {citations.length ? (
                <div className="pdf-citations">
                  <strong>Relevant Excerpts</strong>
                  <ul>
                    {citations.map((item, idx) => (
                      <li key={`${idx}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
