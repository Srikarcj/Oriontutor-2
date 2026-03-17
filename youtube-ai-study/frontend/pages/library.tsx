import { useEffect, useState } from "react";
import { AppShell } from "../components/layout/app-shell";

export default function LibraryPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/library")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setItems(data?.items || []));
  }, []);

  return (
    <AppShell title="Library" subtitle="Your saved notes, PDFs, and resources.">
      {!items.length ? <p>No saved items yet.</p> : null}
      <div className="library-grid">
        {items.map((item) => (
          <div key={item.id} className="library-item">
            <strong>{item.title}</strong>
            <span>{item.item_type}{item.bookmarked ? " · Bookmarked" : ""}</span>
            {item.metadata?.summary ? <p>{item.metadata.summary}</p> : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
