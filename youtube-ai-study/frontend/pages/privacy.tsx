import { AppShell } from "../components/layout/app-shell";

export default function PrivacyPage() {
  return (
    <AppShell title="Privacy Policy" subtitle="We respect your data and keep it secure.">
      <div className="page-container">
        <section className="page-hero">
          <div className="page-hero-content">
            <span className="page-hero-kicker">Privacy</span>
            <h1 className="page-hero-title">Your privacy, protected by design.</h1>
            <p className="page-hero-subtitle">
              OrionTutor is built to keep your learning data safe, transparent, and under your control.
            </p>
            <div className="page-hero-actions">
              <a className="page-hero-primary" href="/contact">
                Contact Support
              </a>
              <a className="page-hero-secondary" href="/terms">
                Read Terms
              </a>
            </div>
          </div>
        </section>

        <section className="policy-grid">
          <div className="policy-section">
            <h3>Information We Collect</h3>
            <p>
              We store video analysis outputs, transcripts, and notes to build your learning library. Account
              access is managed securely via Clerk authentication.
            </p>
          </div>
          <div className="policy-section">
            <h3>How Data Is Used</h3>
            <p>Your data powers your workspace experience and is never sold or shared for advertising.</p>
          </div>
          <div className="policy-section">
            <h3>Cookies</h3>
            <p>
              We use essential cookies for authentication and session continuity. Optional analytics are kept
              minimal.
            </p>
          </div>
          <div className="policy-section">
            <h3>Security Practices</h3>
            <p>
              We apply encryption in transit and strong access controls to keep your content private and
              protected.
            </p>
          </div>
          <div className="policy-section">
            <h3>User Rights</h3>
            <p>You can request access, correction, or deletion of your data at any time.</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
