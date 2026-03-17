export type LeaderboardRow = {
  user_id: string;
  points: number;
  quiz_score_avg?: number;
  attempts?: number;
};

export default function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="leaderboard-table">
      <div className="leaderboard-row header">
        <span>Rank</span>
        <span>User</span>
        <span>Points</span>
        <span>Quiz Avg</span>
        <span>Attempts</span>
      </div>
      {rows.map((row, idx) => (
        <div key={row.user_id} className="leaderboard-row">
          <span>#{idx + 1}</span>
          <span className="leaderboard-user">{row.user_id.slice(0, 6)}...</span>
          <span className="leaderboard-points">{row.points}</span>
          <span>{row.quiz_score_avg?.toFixed ? row.quiz_score_avg.toFixed(1) : row.quiz_score_avg ?? 0}</span>
          <span>{row.attempts ?? 0}</span>
        </div>
      ))}
    </div>
  );
}
