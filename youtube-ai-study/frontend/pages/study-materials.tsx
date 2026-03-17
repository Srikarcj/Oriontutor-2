import { useEffect, useState } from "react";
import { AppShell } from "../components/layout/app-shell";
import PDFChatBot from "../components/pdf-chatbot";

export default function StudyMaterialsPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [materials, setMaterials] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/courses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const items = data?.items || [];
        setCourses(items);
        if (items.length && !selected) setSelected(items[0].slug || items[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/courses/content?course_slug=${encodeURIComponent(selected)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setMaterials(data?.materials || []);
      });
  }, [selected]);

  return (
    <AppShell title="Study Materials" subtitle="Access PDFs and resources aligned to your level.">
      <div className="materials-header">
        <label>
          Course
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {courses.map((course) => (
              <option key={course.id} value={course.slug || course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="materials-grid">
        {materials.map((item) => (
          <div key={item.id} className="material-card">
            <strong>{item.title}</strong>
            <span>{item.material_type}</span>
            {item.description ? <p>{item.description}</p> : null}
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer" className="material-link">
                Open material
              </a>
            ) : null}
          </div>
        ))}
      </div>
      <PDFChatBot />
    </AppShell>
  );
}
