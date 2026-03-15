import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "../components/layout/app-shell";
import { supabaseClient } from "../lib/client/supabase";
import { getCourseBySlug } from "../lib/course-data";

const STORAGE_KEY = "oriontutor-course-progress";
const LOCAL_ENROLL_KEY = "oriontutor-local-enrollments";

type CourseProgress = Record<string, { passedDays: number[]; scores: Record<string, number> }>;
type ProgressRow = { course_slug: string; passed_days: number[]; scores: Record<string, number> };

function loadLocal(): CourseProgress {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CourseProgress;
  } catch {
    return {};
  }
}

function toProgress(rows: ProgressRow[]): CourseProgress {
  return rows.reduce((acc, row) => {
    acc[row.course_slug] = {
      passedDays: row.passed_days || [],
      scores: row.scores || {},
    };
    return acc;
  }, {} as CourseProgress);
}

function loadLocalEnrollments(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_ENROLL_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function buildLocalEnrollments(slugs: string[]) {
  return slugs
    .map((slug) => {
      const course = getCourseBySlug(slug);
      if (!course) return null;
      const lessonsCount = course.stages.reduce((acc, stage) => acc + stage.days.length, 0);
      return {
        course_id: `local-${slug}`,
        courses: {
          id: `local-${slug}`,
          slug: course.slug,
          title: course.title,
          instructor: course.instructor,
          lessons_count: lessonsCount,
        },
      };
    })
    .filter(Boolean) as Array<{ course_id: string; courses: any }>;
}

export default function MyLearningPage() {
  const { user } = useUser();
  const [progress, setProgress] = useState<CourseProgress>({});
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const localEnrollments = buildLocalEnrollments(loadLocalEnrollments());
      if (!user || !supabaseClient) {
        setProgress(loadLocal());
        setEnrollments(localEnrollments);
        setLeaderboard([]);
        return;
      }

      const [progressRes, enrollRes, leaderboardRes] = await Promise.all([
        fetch("/api/progress/get").catch(() => null),
        fetch("/api/enrollments").catch(() => null),
        fetch("/api/leaderboard").catch(() => null),
      ]);

      if (!active) return;
      if (!progressRes || !progressRes.ok) {
        setProgress(loadLocal());
      } else {
        const data = await progressRes.json().catch(() => ({}));
        setProgress(toProgress(data.items || []));
      }

      if (!enrollRes || !enrollRes.ok) {
        setEnrollments(localEnrollments);
      } else {
        const data = await enrollRes.json().catch(() => ({}));
        setEnrollments(data.items || []);
      }
      if (leaderboardRes && leaderboardRes.ok) {
        const data = await leaderboardRes.json().catch(() => ({}));
        setLeaderboard((data.items || []).slice(0, 3));
      } else {
        setLeaderboard([]);
      }
    }

    hydrate();

    let channel: any = null;
    if (user && supabaseClient) {
      channel = supabaseClient
        .channel("progress-stream")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "course_progress", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as ProgressRow;
            setProgress((prev) => ({
              ...prev,
              [row.course_slug]: { passedDays: row.passed_days || [], scores: row.scores || {} },
            }));
          }
        )
        .subscribe();
    }

    return () => {
      active = false;
      if (channel) supabaseClient?.removeChannel(channel);
    };
  }, [user]);

  const pendingTests = useMemo(() => {
    return enrollments.map((enroll) => {
      const course = enroll.courses;
      const cleared = progress[course.slug]?.passedDays?.length || 0;
      return { title: course.title, day: cleared + 1, slug: course.slug };
    });
  }, [enrollments, progress]);

  return (
    <AppShell title="My Learning" subtitle="Track progress, evaluations, and unlocked lessons">
      <section className="learning-dashboard">
        <div className="learning-summary">
          <div className="summary-card">
            <strong>Enrolled Courses</strong>
            <span>{enrollments.length}</span>
          </div>
          <div className="summary-card">
            <strong>Completed Lessons</strong>
            <span>{Object.values(progress).reduce((acc, item) => acc + (item.passedDays?.length || 0), 0)}</span>
          </div>
          <div className="summary-card">
            <strong>Live Updates</strong>
            <span>Active</span>
          </div>
          <div className="summary-card">
            <strong>Pending Tests</strong>
            <span>{pendingTests.length}</span>
          </div>
        </div>

        <div className="learning-grid">
          {enrollments.map((enroll, idx) => {
            const course = enroll.courses;
            const cleared = progress[course.slug]?.passedDays?.length || 0;
            const percent = course.lessons_count
              ? Math.min(Math.round((cleared / course.lessons_count) * 100), 100)
              : Math.min(cleared * 10, 100);
            return (
              <div key={course.slug} className="learning-card">
                <div className="learning-card-header">
                  <div>
                    <h3>{course.title}</h3>
                    <p>{course.instructor}</p>
                  </div>
                  <a href={`/learning/${course.slug}`} className="cta-secondary">
                    Open Course
                  </a>
                </div>
                <div className="learning-progress">
                  <div>
                    <span>Progress</span>
                    <strong>{percent}%</strong>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill progress-${idx}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <div className="learning-meta">
                  <div>
                    <span>Completed Lessons</span>
                    <strong>{cleared}</strong>
                  </div>
                  <div>
                    <span>Unlocked</span>
                    <strong>Day {Math.max(1, cleared + 1)}</strong>
                  </div>
                </div>
                <div className="learning-actions">
                  <a href={`/learning/${course.slug}#learning-shell`} className="cta-primary small">Continue Learning</a>
                  <a href={`/learning/${course.slug}/exam/${Math.max(1, cleared + 1)}`} className="cta-secondary">Take Test</a>
                </div>
              </div>
            );
          })}
        </div>

        <div className="learning-secondary">
          <div className="learning-card">
            <h3>Pending Tests</h3>
            <ul>
              {pendingTests.map((item) => (
                <li key={`${item.slug}-${item.day}`}>
                  {item.title} - Day {item.day} Test
                </li>
              ))}
            </ul>
          </div>
          <div className="learning-card">
            <h3>Leaderboard</h3>
            <ol>
              {leaderboard.map((row, idx) => (
                <li key={`${row.user_id}-${idx}`}>
                  {row.user?.username || row.user?.full_name || "Learner"} - {row.points} pts
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
