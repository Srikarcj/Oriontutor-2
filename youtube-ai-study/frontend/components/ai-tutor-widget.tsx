import { FormEvent, useMemo, useState } from "react";
import { Bot, Send } from "lucide-react";

const quickPrompts = [
  "Explain this lesson in simple terms.",
  "Give me a practice question.",
  "Recommend a resource to learn faster.",
];

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function AiTutorWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi, I am the OrionTutor AI Tutor. Ask me about a course, concept, or assignment.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const canSend = message.trim().length > 0 && !loading;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    const userMessage = message.trim();
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "I could not answer that yet." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I hit a network issue. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestionButtons = useMemo(
    () =>
      quickPrompts.map((prompt) => (
        <button key={prompt} type="button" onClick={() => setMessage(prompt)}>
          {prompt}
        </button>
      )),
    []
  );

  return (
    <div className={`ai-tutor ${open ? "open" : ""}`}>
      <button className="ai-tutor-toggle" onClick={() => setOpen((prev) => !prev)}>
        <Bot size={18} />
        {open ? "Hide Tutor" : "AI Tutor"}
      </button>
      {open ? (
        <div className="ai-tutor-panel">
          <div className="ai-tutor-header">
            <div>
              <strong>OrionTutor AI Tutor</strong>
              <span>Course Q and A, quizzes, and guidance</span>
            </div>
          </div>
          <div className="ai-tutor-messages">
            {messages.map((item, idx) => (
              <div key={`${item.role}-${idx}`} className={`ai-tutor-msg ${item.role}`}>
                {item.content}
              </div>
            ))}
            {loading ? <div className="ai-tutor-msg assistant">Thinking...</div> : null}
          </div>
          <div className="ai-tutor-suggestions">{suggestionButtons}</div>
          <form onSubmit={handleSubmit} className="ai-tutor-form">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about a lesson, quiz, or project"
            />
            <button type="submit" disabled={!canSend}>
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
