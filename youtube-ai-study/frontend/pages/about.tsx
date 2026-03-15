import { AppShell } from "../components/layout/app-shell";

export default function AboutPage() {
  return (
    <AppShell title="About" subtitle="The story behind OrionTutor and the future of AI-guided learning.">
      <div className="page-container">
        <section className="page-hero">
          <div className="page-hero-content">
            <span className="page-hero-kicker">Our Mission</span>
            <h1 className="page-hero-title">Guiding learners with constellation-level clarity.</h1>
            <p className="page-hero-subtitle">
              OrionTutor is built to transform long-form video into a structured learning journey. We help
              you capture knowledge, connect ideas, and move faster with AI that stays out of the way.
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


        <section className="creator-section">
          <div className="creator-card">
            <div className="creator-portrait" aria-hidden="true">
              <svg viewBox="0 0 120 120" role="img" aria-label="Creator illustration">
                <defs>
                  <linearGradient id="creator-bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="56" fill="url(#creator-bg)" opacity="0.18" />
                <circle cx="60" cy="62" r="26" fill="#fde8d3" />
                <path
                  d="M30 52c6-16 20-26 30-26s24 10 30 26c-10-8-20-10-30-10s-20 2-30 10z"
                  fill="#1f2937"
                />
                <path d="M40 48c4-8 12-12 20-12s16 4 20 12" fill="#111827" />
                <circle cx="50" cy="64" r="3" fill="#1f2937" />
                <circle cx="70" cy="64" r="3" fill="#1f2937" />
                <path d="M52 74c4 4 12 4 16 0" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
                <path d="M44 60c2-3 6-5 10-5" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
                <path d="M76 60c-2-3-6-5-10-5" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
                <circle cx="60" cy="86" r="18" fill="#4f46e5" opacity="0.2" />
                <path d="M38 92c6-10 38-10 44 0" fill="#4f46e5" opacity="0.35" />
              </svg>
            </div>
            <div className="creator-content">
              <span className="creator-kicker">Creator Spotlight</span>
              <h2>Meet CJ SURIYA</h2>
              <p>
                CJ SURIYA is the mind behind OrionTutor ? focused on making learning feel effortless by
                turning complex videos into intuitive, beautiful study systems. His obsession with clarity,
                visual thinking, and AI-human collaboration is what powers the OrionTutor experience.
              </p>
              <div className="creator-highlights">
                <div>
                  <strong>Product Vision</strong>
                  <span>AI-first learning that feels human.</span>
                </div>
                <div>
                  <strong>Design Focus</strong>
                  <span>Visual study flows built for retention.</span>
                </div>
                <div>
                  <strong>Community</strong>
                  <span>Helping ambitious learners level up fast.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="info-grid">
          <div className="info-card">
            <h3>Our Mission</h3>
            <p>
              We believe every learner deserves clarity. OrionTutor translates complex video content into
              clean, navigable study systems that feel effortless.
            </p>
          </div>
          <div className="info-card">
            <h3>Technology Stack</h3>
            <ul>
              <li>Artificial Intelligence for semantic understanding</li>
              <li>Natural Language Processing for structured notes</li>
              <li>Video Analysis for timestamps and visual insights</li>
              <li>AI-assisted learning tools for mastery</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>Future Vision</h3>
            <p>
              We are building the most trusted AI learning workspace for professionals, students, and
              teams — with deeper personalization, smarter recall tools, and richer collaboration.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
