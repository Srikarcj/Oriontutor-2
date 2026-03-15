import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/layout/app-shell";
import { SectionCard, SkeletonLines } from "../components/feature-panels";
import { fetchJson, type LibraryResponse } from "../lib/client/api";
import { Button, Input } from "../components/ui";

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryResponse["items"]>([]);
  const [personal, setPersonal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [topic, setTopic] = useState("all");

  useEffect(() => {
    Promise.all([fetch("/api/library"), fetch("/api/library/personal")])
      .then(async ([videosRes, personalRes]) => {
        const res = await videosRes.json();
        if (res.warning) {
          setError(res.warning);
        }
        setItems(res.items || []);
        if (personalRes.ok) {
          const data = await personalRes.json();
          setPersonal(data.items || []);
        }
      })
      .catch((e: any) => setError(e.message || "Failed to load library"))
      .finally(() => setLoading(false));
  }, []);

  async function downloadPdf(url?: string | null, title?: string) {
    if (!url) return;
    const resolved = url.startsWith("/")
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${url}`
      : url;
    const res = await fetch(resolved);
    if (!res.ok) return;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${title || "study-notes"}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    let results = items.filter((item) => {
      if (!lower) return true;
      return (
        item.title?.toLowerCase().includes(lower) ||
        item.youtube_url?.toLowerCase().includes(lower)
      );
    });

    if (topic !== "all") {
      results = results.filter((item) => (item.content?.topics || []).includes(topic));
    }

    if (sortBy === "oldest") {
      results = results.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
    } else if (sortBy === "title") {
      results = results.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else {
      results = results.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }

    return results;
  }, [items, query, sortBy, topic]);

  const topics = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      (item.content?.topics || []).forEach((t) => set.add(String(t)));
    });
    return Array.from(set).sort();
  }, [items]);

  return (
    <AppShell title="Library" subtitle="Your AI summaries and saved learning assets">
      <SectionCard
        title="YouTube Summarized Library"
        actions={
          <div className="library-toolbar">
            <Input
              placeholder="Search videos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="library-search"
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select-input">
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title</option>
            </select>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="select-input">
              <option value="all">All Topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        }
      >
        {loading ? <SkeletonLines count={6} /> : null}
        {error ? (
          <div className="error-text">
            {error}
            {error.toLowerCase().includes("schema") ? (
              <div className="muted">
                Run `npm run db:bootstrap` with `SUPABASE_DB_URL` set in `.env.local`.
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="library-grid library-grid-advanced">
          {filtered.map((item) => (
            <div key={item.id} className="library-card-advanced">
                <img src={item.thumbnail || "/oriontutor-mark.svg"} alt={item.title} />
              <div className="library-meta">
                <h3>{item.title}</h3>
                <p className="library-summary">
                  {item.content?.summary || "Summary will appear once analysis is complete."}
                </p>
                <div className="library-date">
                  Analyzed {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="library-actions">
                <Link href={`/notes?videoId=${item.id}`} className="library-action-link">
                  View Notes
                </Link>
                <Link href={`/full-transcript?videoId=${item.id}`} className="library-action-link">
                  FULL TRANSCRIPT
                </Link>
                <Link href={`/dashboard?videoId=${item.id}&tab=Mind%20Map`} className="library-action-link">
                  Mind Map
                </Link>
                <Link href={`/dashboard?videoId=${item.id}&tab=Flashcards`} className="library-action-link">
                  Flashcards
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    downloadPdf(item.content?.pdf_url, item.title);
                  }}
                >
                  Download PDF
                </Button>
                <Button variant="ghost" size="sm" disabled title="Delete is not available in this build.">
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
        {!loading && !filtered.length ? <p className="muted">No videos match your search.</p> : null}
      </SectionCard>
      <SectionCard title="Student Personal Library">
        {personal.length ? (
          <div className="library-grid library-grid-advanced">
            {personal.map((item) => (
              <div key={item.id} className="library-card-advanced">
                <div className="library-meta">
                  <h3>{item.title}</h3>
                  <p className="library-summary">{item.metadata?.summary || item.item_type}</p>
                  <div className="library-date">
                    Saved {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="library-actions">
                  {item.metadata?.url ? (
                    <a href={item.metadata.url} className="library-action-link" target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Your saved notes, PDFs, and favorite lessons will appear here.</p>
        )}
      </SectionCard>
    </AppShell>
  );
}
