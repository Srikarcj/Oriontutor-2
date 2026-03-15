import { AppShell } from "../components/layout/app-shell";
import { Link2, Sparkles, FileText, Network, MessageCircle } from "lucide-react";

const STEPS = [
  {
    title: "Paste a YouTube video link",
    description: "Drop any video URL and let OrionTutor queue the analysis.",
    icon: Link2,
  },
  {
    title: "OrionTutor AI analyzes the video",
    description: "We extract structure, chapters, key moments, and context automatically.",
    icon: Sparkles,
  },
  {
    title: "Generate transcripts and summaries",
    description: "Instant transcripts, structured notes, and actionable summaries appear.",
    icon: FileText,
  },
  {
    title: "Explore concepts with mind maps",
    description: "Navigate relationships between ideas through interactive visual maps.",
    icon: Network,
  },
  {
    title: "Ask AI questions to understand topics",
    description: "Use conversational AI to clarify concepts and jump to timestamps.",
    icon: MessageCircle,
  },
];

export default function HowItWorksPage() {
  return (
    <AppShell title="How It Works" subtitle="A guided journey from video to mastery.">
      <div className="page-container">
        <section className="page-hero">
          <div className="page-hero-content">
            <span className="page-hero-kicker">How It Works</span>
            <h1 className="page-hero-title">From link to learning in minutes.</h1>
            <p className="page-hero-subtitle">
              OrionTutor orchestrates transcripts, summaries, and AI-powered study tools into one seamless
              workflow.
            </p>
            <div className="page-hero-actions">
              <a className="page-hero-primary" href="/dashboard">
                Go to Dashboard
              </a>
              <a className="page-hero-secondary" href="/features">
                Explore Features
              </a>
            </div>
          </div>
        </section>

        <section className="steps-grid">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="step-card">
                <span className="card-icon">
                  <Icon size={18} />
                </span>
                <h4>
                  {index + 1}. {step.title}
                </h4>
                <p>{step.description}</p>
              </div>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
