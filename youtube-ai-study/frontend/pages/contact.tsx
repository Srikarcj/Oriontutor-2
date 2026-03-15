import { AppShell } from "../components/layout/app-shell";
import { Mail, MessageSquare } from "lucide-react";

export default function ContactPage() {
  return (
    <AppShell title="Contact" subtitle="We respond quickly to product and support questions.">
      <div className="page-container">
        <section className="page-hero">
          <div className="page-hero-content">
            <span className="page-hero-kicker">Contact</span>
            <h1 className="page-hero-title">Talk to the OrionTutor team.</h1>
            <p className="page-hero-subtitle">
              Have questions about features, pricing, or your workspace? Send a message and we will
              respond within 24 hours.
            </p>
            <div className="page-hero-actions">
              <a className="page-hero-primary" href="/dashboard">
                Go to Dashboard
              </a>
              <a className="page-hero-secondary" href="/documentation">
                View Documentation
              </a>
            </div>
          </div>
        </section>

        <section className="contact-grid">
          <div className="feature-card-advanced">
            <span className="card-icon">
              <Mail size={18} />
            </span>
            <h3>Support email</h3>
            <p>support@oriontutor.ai</p>
            <p>We typically respond within 24 hours.</p>
            <div className="card-icon">
              <MessageSquare size={18} />
            </div>
            <p>Support hours: Mon-Fri, 9am-6pm</p>
          </div>
          <div className="feature-card-advanced">
            <h3>Send a message</h3>
            <form
              className="contact-form"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <input type="text" placeholder="Name" />
              <input type="email" placeholder="Email" />
              <textarea rows={5} placeholder="Message" />
              <button className="page-hero-primary" type="submit">
                Send message
              </button>
            </form>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
