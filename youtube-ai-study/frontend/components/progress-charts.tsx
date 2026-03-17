export type ProgressRow = {
  course_id: string;
  skill_level?: string;
  quiz_score?: number;
};

export default function ProgressCharts({ rows }: { rows: ProgressRow[] }) {
  if (!rows.length) return <p>No course progress yet.</p>;
  return (
    <div className="progress-charts">
      {rows.map((row) => (
        <div key={row.course_id} className="progress-item">
          <div className="progress-meta">
            <strong>{row.course_id.slice(0, 6)}...</strong>
            <span>{row.skill_level || "Unassigned"}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${row.quiz_score || 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
