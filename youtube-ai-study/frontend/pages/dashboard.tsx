import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "../components/layout/app-shell";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabaseClient } from "../lib/client/supabase";

export default function DashboardPage() {
  const { user } = useUser();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    async function hydrate() {
      const [enrollRes, progressRes, profileRes, leaderboardRes] = await Promise.all([
        fetch("/api/enrollments").catch(() => null),
        fetch("/api/progress/get").catch(() => null),
        fetch("/api/profile").catch(() => null),
        fetch("/api/leaderboard").catch(() => null),
      ]);

      if (enrollRes) setEnrollments((await enrollRes.json()).items || []);
      if (progressRes) setProgress((await progressRes.json()).items || []);
      if (profileRes) setProfile(await profileRes.json());
      if (leaderboardRes) setLeaderboard((await leaderboardRes.json()).items || []);
    }
    hydrate().catch(() => null);
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;
    const channel = supabaseClient
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard" }, () => {
        fetch("/api/leaderboard").then((res) => res.json()).then((d) => setLeaderboard(d.items || [])).catch(() => null);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "course_progress" }, () => {
        fetch("/api/progress/get").then((res) => res.json()).then((d) => setProgress(d.items || [])).catch(() => null);
      })
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const continueLearning = useMemo(() => {
    const enroll = enrollments[0];
    if (!enroll) return null;
    const course = enroll.courses;
    const progressRow = progress.find((row: any) => row.course_slug === course.slug);
    const nextDay = progressRow?.passed_days?.length ? Math.max(...progressRow.passed_days) + 1 : 1;
    return { course, nextDay };
  }, [enrollments, progress]);

  const myRank = useMemo(() => {
    if (!user) return null;
    const index = leaderboard.findIndex((row) => row.user_id === user.id);
    return index >= 0 ? index + 1 : null;
  }, [leaderboard, user]);

  const progressSeries = useMemo(() => {
    return enrollments.map((enroll) => {
      const course = enroll.courses;
      const row = progress.find((p: any) => p.course_slug === course.slug);
      const cleared = row?.passed_days?.length || 0;
      const total = course.lessons_count || 0;
      return {
        name: course.title,
        progress: total ? Math.round((cleared / total) * 100) : 0,
      };
    });
  }, [enrollments, progress]);

  return (
    <AppShell title="Dashboard" subtitle="Your AI learning command center">
      <section className="dashboard-learning">
        <div className="section-head">
          <p className="section-kicker">Learning Dashboard</p>
          <h2>Track your AI-powered course progress.</h2>
          <p>All stats are synced live with Supabase.</p>
        </div>
        <div className="learning-grid">
          <div className="learning-card">
            <div className="learning-card-header">
              <div>
                <h3>Continue Learning</h3>
                <p>{continueLearning ? continueLearning.course.title : "No course enrolled"}</p>
              </div>
              {continueLearning ? (
                <a className="cta-secondary" href={`/learning/${continueLearning.course.slug}#learning-shell`}>
                  Open Course
                </a>
              ) : null}
            </div>
            <div className="learning-meta">
              <div>
                <span>Next Lesson</span>
                <strong>{continueLearning ? `Day ${continueLearning.nextDay}` : "--"}</strong>
              </div>
              <div>
                <span>Learning Streak</span>
                <strong>{profile?.streak || 0} days</strong>
              </div>
              <div>
                <span>Leaderboard Rank</span>
                <strong>{myRank ? `#${myRank}` : "--"}</strong>
              </div>
            </div>
          </div>

          <div className="learning-card">
            <div className="learning-card-header">
              <div>
                <h3>Quiz Scores</h3>
                <p>Average performance across lessons</p>
              </div>
            </div>
            <div className="learning-progress">
              <div>
                <span>Average Score</span>
                <strong>{profile?.avg_score ? `${Math.round(profile.avg_score)}%` : "--"}</strong>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.round(profile?.avg_score || 0)}%` }}
                />
              </div>
            </div>
            <div className="learning-meta">
              <div>
                <span>Quizzes Passed</span>
                <strong>{profile?.quizzes_passed || 0}</strong>
              </div>
              <div>
                <span>Courses Completed</span>
                <strong>{profile?.courses_completed || 0}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="learning-secondary">
          <div className="learning-card">
            <h3>Enrolled Courses</h3>
            <ul>
              {enrollments.map((enroll) => {
                const course = enroll.courses;
                const progressRow = progress.find((row: any) => row.course_slug === course.slug);
                const cleared = progressRow?.passed_days?.length || 0;
                const total = course.lessons_count || 0;
                const pct = total ? Math.round((cleared / total) * 100) : 0;
                return (
                  <li key={enroll.course_id}>
                    {course?.title} — {pct}%
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="learning-card">
            <h3>Leaderboard Snapshot</h3>
            <ol>
              {leaderboard.slice(0, 3).map((row: any) => (
                <li key={row.user_id}>
                  {row.user?.username || row.user?.full_name || "Learner"} - {row.points} pts
                </li>
              ))}
            </ol>
          </div>
          <div className="learning-card">
            <h3>Learning Progress</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={progressSeries}>
                  <XAxis dataKey="name" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip />
                  <Bar dataKey="progress" fill="rgba(57, 255, 20, 0.7)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
