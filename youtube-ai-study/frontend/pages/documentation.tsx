import { AppShell } from "../components/layout/app-shell";

const DOCS = [
  {
    title: "Getting started",
    body: [
      "Sign in, open the dashboard, and paste a YouTube link to begin.",
      "OrionTutor automatically builds a workspace for each analyzed video.",
    ],
  },
  {
    title: "How to analyze a video",
    body: [
      "Paste a YouTube URL and click Analyze Video.",
      "Processing runs in the background and updates your workspace automatically.",
    ],
  },
  {
    title: "Understanding summaries",
    body: [
      "Video Summary highlights the core narrative and key takeaways.",
      "Detailed Notes expand the explanation with structured concepts and examples.",
    ],
  },
  {
    title: "Using AI questions",
    body: [
      "Ask precise questions to get grounded answers with timestamps.",
      "Use suggested prompts to explore topics faster.",
    ],
  },
  {
    title: "Exporting notes and PDFs",
    body: [
      "Use Download PDF to export your notes for offline study.",
      "Copy Notes lets you save structured data to your clipboard.",
    ],
  },
  {
    title: "Using mind maps and flashcards",
    body: [
      "Mind maps visualize relationships between concepts and help with recall.",
      "Flashcards offer quick review and spaced repetition on key ideas.",
    ],
  },
];

export default function DocumentationPage() {
  return (
    <AppShell title="Documentation" subtitle="Learn every OrionTutor feature in minutes.">
      <div className="page-container">
        <section className="page-hero">
          <div className="page-hero-content">
            <span className="page-hero-kicker">Documentation</span>
            <h1 className="page-hero-title">Your OrionTutor user guide.</h1>
            <p className="page-hero-subtitle">
              Browse step-by-step guidance for analyzing videos, understanding summaries, and exporting
              your learning assets.
            </p>
            <div className="page-hero-actions">
              <a className="page-hero-primary" href="/dashboard">
                Go to Dashboard
              </a>
              <a className="page-hero-secondary" href="/how-it-works">
                How It Works
              </a>
            </div>
          </div>
        </section>

        <section className="doc-accordion">
          {DOCS.map((doc) => (
            <details key={doc.title} className="doc-item">
              <summary>{doc.title}</summary>
              <div className="doc-content">
                {doc.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </details>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
