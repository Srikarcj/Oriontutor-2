import { useEffect, useState } from "react";
import { AppShell } from "../components/layout/app-shell";
import LeaderboardTable from "../components/leaderboard-table";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRows(data?.items || []));
  }, []);

  return (
    <AppShell title="Leaderboard" subtitle="Track your performance against the community.">
      {!rows.length ? <p>No leaderboard entries yet.</p> : null}
      <LeaderboardTable rows={rows} />
    </AppShell>
  );
}
