import { AppShell } from "../components/layout/app-shell";
import {
  Sparkles,
  FileText,
  StickyNote,
  Network,
  Layers,
  Image,
  MessageCircle,
  Download,
} from "lucide-react";

const FEATURES = [
  {
    title: "AI Video Analysis",
    description: "OrionTutor detects structure, chapters, and key themes automatically.",
    icon: Sparkles,
  },
  {
    title: "Automatic Transcript Generation",
    description: "Accurate transcripts with timestamps to navigate key moments fast.",
    icon: FileText,
  },
  {
    title: "Structured Study Notes",
    description: "Clean summaries, main concepts, and detailed explanations in minutes.",
    icon: StickyNote,
  },
  {
    title: "Mind Map Generator",
    description: "Visualize relationships between ideas with interactive mind maps.",
    icon: Network,
  },
  {
    title: "Flashcard Creation",
    description: "Turn highlights into flashcards for quick, spaced review.",
    icon: Layers,
  },
  {
    title: "Visual Insights",
    description: "Explore key visual moments and AI explanations in context.",
    icon: Image,
  },
  {
    title: "AI Question Answering",
    description: "Ask questions and get grounded answers with timestamp awareness.",
    icon: MessageCircle,
  },
  {
    title: "PDF Export",
    description: "Export premium notes and summaries for offline review.",
    icon: Download,
  },
];

export default function FeaturesPage() {
  return (
    <AppShell title="Features" subtitle="Premium AI learning capabilities built for modern study workflows.">
      <div className="page-container">
        <section className="page-hero">
          <div className="page-hero-content">
            <span className="page-hero-kicker">Features</span>
            <h1 className="page-hero-title">Everything you need to learn at Orion speed.</h1>
            <p className="page-hero-subtitle">
              OrionTutor brings transcripts, summaries, visual maps, and AI guidance into one elegant
              workspace — designed for clarity and momentum.
            </p>
            <div className="page-hero-actions">
              <a className="page-hero-primary" href="/dashboard">
                Go to Dashboard
              </a>
              <a className="page-hero-secondary" href="/how-it-works">
                See How It Works
              </a>
            </div>
          </div>
        </section>

        <section className="feature-grid-advanced">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="feature-card-advanced">
                <span className="card-icon">
                  <Icon size={18} />
                </span>
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
