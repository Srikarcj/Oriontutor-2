import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "../components/layout/app-shell";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabaseClient } from "../lib/client/supabase";

export default function ProfilePage() {
  const { user } = useUser();
  const [profile, setProfile] = useState<any | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    async function hydrate() {
      const [profileRes, enrollRes] = await Promise.all([
        fetch("/api/profile").catch(() => null),
        fetch("/api/enrollments").catch(() => null),
      ]);
      if (profileRes) setProfile(await profileRes.json());
      if (enrollRes) setEnrollments((await enrollRes.json()).items || []);
    }
    hydrate().catch(() => null);
  }, []);

  useEffect(() => {
    if (!supabaseClient || !user) return;
    const channel = supabaseClient
      .channel("profile-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_quiz_attempts" }, () => {
        fetch("/api/profile").then((res) => res.json()).then(setProfile).catch(() => null);
      })
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user]);

  const progressSeries = (profile?.progress || []).map((row: any) => {
    const total = enrollments.find((e) => e.courses?.slug === row.course_slug)?.courses?.lessons_count || 0;
    const cleared = row.passed_days?.length || 0;
    const pct = total ? Math.round((cleared / total) * 100) : 0;
    return { name: row.course_slug.replace(/-/g, " "), progress: pct };
  });

  return (
    <AppShell title="Student Profile" subtitle="Your learning journey in real time">
      <section className="profile-page">
        <div className="profile-header">
          <div className="profile-card">
            <img src={user?.imageUrl || "/oriontutor-mark.svg"} alt="Profile" />
            <div>
              <h2>{user?.fullName || "Orion Learner"}</h2>
              <p>{user?.primaryEmailAddress?.emailAddress || "learner@oriontutor.ai"}</p>
            </div>
          </div>
          <div className="profile-streak">
            <strong>Learning Streak</strong>
            <span>{profile?.streak || 0} days</span>
          </div>
        </div>

        <div className="profile-grid">
          <div className="profile-panel">
            <h3>Courses Enrolled</h3>
            <ul>
              {enrollments.map((enroll) => (
                <li key={enroll.course_id}>
                  <strong>{enroll.courses?.title || "Course"}</strong>
                  <span>{profile?.progress?.find((p: any) => p.course_slug === enroll.courses?.slug)?.passed_days?.length || 0} lessons cleared</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="profile-panel">
            <h3>Achievements</h3>
            <div className="badge-grid">
              {(profile?.badges || []).map((badge: any) => (
                <span className="badge" key={badge.badge_name}>{badge.badge_name}</span>
              ))}
            </div>
          </div>
          <div className="profile-panel">
            <h3>Real-time Stats</h3>
            <div className="profile-stats">
              <div>
                <strong>Level</strong>
                <span>{profile?.avg_score >= 80 ? "Advanced" : profile?.avg_score >= 60 ? "Intermediate" : "Beginner"}</span>
              </div>
              <div>
                <strong>Tests Passed</strong>
                <span>{profile?.quizzes_passed || 0}</span>
              </div>
              <div>
                <strong>Average Score</strong>
                <span>{profile?.avg_score ? `${Math.round(profile.avg_score)}%` : "--"}</span>
              </div>
            </div>
          </div>
          <div className="profile-panel">
            <h3>Learning Analytics</h3>
            <div className="profile-chart">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={progressSeries}>
                    <XAxis dataKey="name" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip />
                    <Area type="monotone" dataKey="progress" stroke="#39ff14" fill="rgba(57, 255, 20, 0.25)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
