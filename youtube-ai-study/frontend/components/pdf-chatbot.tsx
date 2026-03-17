import { useState } from "react";

export default function PDFChatBot() {
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/pdf/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDocumentId(data.id);
      setDocumentName(data.name || file.name);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!documentId || !question.trim()) return;
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/pdf/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: documentId, question }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAnswer(data.answer || "No answer returned");
    } catch (err: any) {
      setError(err?.message || "Failed to answer");
    }
  };

  return (
    <div className="pdf-chatbot">
      <h3>PDF AI Q&A</h3>
      <p>Upload a PDF and ask questions using the shared vector search pipeline.</p>
      <div className="pdf-upload">
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleUpload(file);
          }}
          disabled={uploading}
        />
        {uploading ? <span>Uploading...</span> : null}
        {documentName ? <span className="pdf-doc">{documentName}</span> : null}
      </div>
      <div className="pdf-ask">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about this PDF"
        />
        <button onClick={handleAsk} disabled={!documentId || !question.trim()}>
          Ask
        </button>
      </div>
      {answer ? <div className="pdf-answer">{answer}</div> : null}
      {error ? <div className="pdf-error">{error}</div> : null}
    </div>
  );
}
