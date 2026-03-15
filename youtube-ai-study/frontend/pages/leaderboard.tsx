import { useEffect, useState } from "react";
import { AppShell } from "../components/layout/app-shell";
import { supabaseClient } from "../lib/client/supabase";

type LeaderboardRow = {
  rank: number;
  points: number;
  quiz_score_avg: number;
  courses_completed: number;
  learning_streak: number;
  progress: number;
  user: { username?: string; full_name?: string; avatar_url?: string } | null;
};

export default function LeaderboardPage() {
  const [items, setItems] = useState<LeaderboardRow[]>([]);

  async function load() {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch(() => null);
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;
    const channel = supabaseClient
      .channel("leaderboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard" }, () => {
        load().catch(() => null);
      })
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  return (
    <AppShell title="Leaderboard" subtitle="Real-time rankings based on learning performance">
      <section className="leaderboard-page">
        <div className="leaderboard-table">
          <div className="leaderboard-row header">
            <span>Rank</span>
            <span>Learner</span>
            <span>Points</span>
            <span>Avg Quiz</span>
            <span>Courses</span>
            <span>Streak</span>
            <span>Progress</span>
          </div>
          {items.map((row) => (
            <div key={`${row.rank}-${row.points}`} className="leaderboard-row">
              <span>#{row.rank}</span>
              <span className="leaderboard-user">
                <img src={row.user?.avatar_url || "/avatar-placeholder.svg"} alt="Avatar" />
                <strong>{row.user?.username || row.user?.full_name || "Learner"}</strong>
              </span>
              <span>{row.points}</span>
              <span>{Math.round(row.quiz_score_avg)}%</span>
              <span>{row.courses_completed}</span>
              <span>{row.learning_streak} days</span>
              <span>{Math.round(row.progress)}%</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
