import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/layout/app-shell";

type Material = {
  id: string;
  title: string;
  description: string;
  size: string;
  type: string;
  course: string;
  category: string;
  signed_url: string | null;
  url: string | null;
};

export default function StudyMaterialsPage() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => setMaterials(data.items || []))
      .catch(() => setMaterials([]));
  }, []);

  const types = useMemo(() => ["All", ...Array.from(new Set(materials.map((item) => item.type)))], [materials]);
  const filtered = materials.filter((item) => typeFilter === "All" || item.type === typeFilter);

  return (
    <AppShell title="Study Materials" subtitle="Download notes, code, assignments, and practice sets">
      <section className="materials-page">
        <div className="materials-toolbar">
          <div>
            <h2>Learning Resources</h2>
            <p>All materials are linked to your enrolled courses.</p>
          </div>
          <div className="materials-filter">
            {types.map((type) => (
              <button
                key={type}
                className={typeFilter === type ? "active" : ""}
                onClick={() => setTypeFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="materials-grid">
          {filtered.map((material) => {
            const href = material.signed_url || material.url || "#";
            return (
              <div key={`${material.id}-${material.course}`} className="material-card">
                <span>{material.type}</span>
                <strong>{material.title}</strong>
                <p>{material.description}</p>
                <div className="material-meta">
                  <em>{material.course}</em>
                  <em>{material.size}</em>
                </div>
                <div className="material-actions">
                  <a className="cta-secondary" href={href} target="_blank" rel="noreferrer">
                    View
                  </a>
                  <a className="cta-primary small" href={href} download>
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        <div className="materials-qa">
          <h3>Ask Questions from PDFs</h3>
          <p>Upload any PDF and get accurate answers with citations.</p>
          <Link href="/pdf-qa" className="cta-primary small">
            Open PDF Q and A
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
