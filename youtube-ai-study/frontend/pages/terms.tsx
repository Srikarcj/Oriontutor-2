import { AppShell } from "../components/layout/app-shell";

export default function TermsPage() {
  return (
    <AppShell title="Terms & Conditions" subtitle="Clear terms to keep the platform reliable and secure.">
      <div className="page-container">
        <section className="page-hero">
          <div className="page-hero-content">
            <span className="page-hero-kicker">Terms</span>
            <h1 className="page-hero-title">Professional, transparent service terms.</h1>
            <p className="page-hero-subtitle">
              These terms help us keep OrionTutor safe, reliable, and respectful for everyone.
            </p>
            <div className="page-hero-actions">
              <a className="page-hero-primary" href="/contact">
                Contact Support
              </a>
              <a className="page-hero-secondary" href="/privacy">
                Privacy Policy
              </a>
            </div>
          </div>
        </section>

        <section className="policy-grid">
          <div className="policy-section">
            <h3>Acceptable Use</h3>
            <p>
              Use OrionTutor responsibly. You retain ownership of your content and remain responsible for the
              videos you analyze.
            </p>
          </div>
          <div className="policy-section">
            <h3>User Responsibilities</h3>
            <p>
              Keep your account secure, provide accurate information, and avoid misuse or abuse of platform
              resources.
            </p>
          </div>
          <div className="policy-section">
            <h3>Intellectual Property</h3>
            <p>
              OrionTutor software, interface, and brand assets are protected. Your outputs remain yours.
            </p>
          </div>
          <div className="policy-section">
            <h3>Service Limitations</h3>
            <p>
              We aim for high availability but cannot guarantee uninterrupted access. Export notes for
              mission-critical use.
            </p>
          </div>
          <div className="policy-section">
            <h3>Termination</h3>
            <p>
              We may suspend accounts that violate these terms. You may also close your account at any time.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
