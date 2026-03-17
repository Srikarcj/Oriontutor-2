import { useEffect, useState } from "react";
import { AppShell } from "../components/layout/app-shell";
import ProgressCharts from "../components/progress-charts";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDashboard(data));
  }, []);

  return (
    <AppShell title="Dashboard" subtitle="Track progress, analytics, and achievements.">
      {!dashboard ? <p>Loading dashboard...</p> : null}
      {dashboard ? (
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Courses Enrolled</h3>
            <strong>{dashboard.courses_enrolled}</strong>
          </div>
          <div className="dashboard-card">
            <h3>Quiz Average</h3>
            <strong>{dashboard.quiz_average?.toFixed?.(1) || 0}%</strong>
          </div>
          <div className="dashboard-card">
            <h3>Skill Profile</h3>
            <div className="skill-profile">
              <span>Beginner: {dashboard.skill_profile?.beginner || 0}</span>
              <span>Intermediate: {dashboard.skill_profile?.intermediate || 0}</span>
              <span>Advanced: {dashboard.skill_profile?.advanced || 0}</span>
            </div>
          </div>
          <div className="dashboard-card full">
            <h3>Progress</h3>
            <ProgressCharts rows={dashboard.progress || []} />
          </div>
          <div className="dashboard-card full">
            <h3>Recommended Courses</h3>
            {!dashboard.recommendations?.length ? <p>No recommendations yet.</p> : null}
            <ul className="achievement-list">
              {(dashboard.recommendations || []).map((item: any) => (
                <li key={item.id}>
                  {item.title} · {item.difficulty}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
