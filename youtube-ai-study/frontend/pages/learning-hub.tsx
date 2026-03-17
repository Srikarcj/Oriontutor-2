import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/layout/app-shell";
import CourseCard from "../components/course-card";

export default function LearningHubPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const category = typeof router.query.category === "string" ? router.query.category : "";

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/courses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        setCourses(data?.items || []);
      })
      .catch(() => {
        if (!active) return;
        setCourses([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    fetch("/api/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.progress) return;
        const map: Record<string, number> = {};
        data.progress.forEach((row: any) => {
          if (row.course_id) {
            map[String(row.course_id)] = Number(row.progress_pct || 0);
          }
        });
        setProgressMap(map);
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => {
    const merged = courses.map((course) => ({
      ...course,
      progress_pct: progressMap[String(course.id)] ?? course.progress_pct,
    }));
    if (!category) return merged;
    return merged.filter((course) => String(course.category || "").toLowerCase() === category.toLowerCase());
  }, [courses, category, progressMap]);

  return (
    <AppShell title="Learning Hub" subtitle="Enroll in adaptive courses built from your learning goals.">
      {loading ? <p>Loading courses...</p> : null}
      {!loading && !visible.length ? <p>No courses available yet. Add courses in Supabase to get started.</p> : null}
      <div className="course-grid">
        {visible.map((course) => (
          <CourseCard key={course.id || course.slug} course={course} />
        ))}
      </div>
    </AppShell>
  );
}
