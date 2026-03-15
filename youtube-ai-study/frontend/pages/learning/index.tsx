import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/layout/app-shell";
import { courses as localCourses } from "../../lib/course-data";

type CourseListItem = {
  id?: string;
  slug: string;
  title: string;
  instructor?: string;
  category?: string;
  level?: "Beginner" | "Intermediate" | "Advanced";
  rating?: number;
  enrollments_count?: number;
  lessons_count?: number;
  students?: number;
  image_url?: string;
  image?: string;
  description?: string;
};

type CoursesStats = {
  students: number;
  courses: number;
  completed: number;
  updatedAt?: string;
};

const categories = [
  "Artificial Intelligence",
  "Machine Learning",
  "Data Science",
  "Web Development",
  "Cyber Security",
  "Programming",
  "Cloud Computing",
];

function getCourseStudents(course: CourseListItem) {
  return course.enrollments_count || course.students || 0;
}

function getCourseRating(course: CourseListItem) {
  return course.rating || 4.7;
}

function getCourseLevel(course: CourseListItem) {
  return course.level || "Beginner";
}

export default function LearningPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [stats, setStats] = useState<CoursesStats>({ students: 0, courses: 0, completed: 0 });
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/courses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        const items = data?.items?.length ? data.items : localCourses;
        setCourses(items);
      })
      .catch(() => {
        if (!active) return;
        setCourses(localCourses as unknown as CourseListItem[]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      try {
        const res = await fetch("/api/courses/stats");
        if (!res.ok) throw new Error("stats");
        const data = await res.json();
        if (!active) return;
        setStats({
          students: Number(data.students || 0),
          courses: Number(data.courses || 0),
          completed: Number(data.completed || 0),
          updatedAt: data.updatedAt,
        });
      } catch {
        if (!active) return;
        setStats((prev) => ({ ...prev }));
      }
    };
    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const filteredCourses = useMemo(() => {
    const query = search.toLowerCase().trim();
    return courses.filter((course) => {
      const matchesCategory = !activeCategory || course.category === activeCategory;
      const matchesQuery =
        !query ||
        course.title?.toLowerCase().includes(query) ||
        course.instructor?.toLowerCase().includes(query) ||
        course.category?.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [courses, activeCategory, search]);

  return (
    <AppShell title="Learning" subtitle="Choose a course and follow a day-by-day learning path.">
      <section className="course-page">
        <div className="course-hero">
          <div>
            <span className="course-badge">Learning Hub</span>
            <h2>Choose a course, enroll, and learn day by day.</h2>
            <p>
              Pass each day’s test with 50%+ to unlock the next day. Every day includes 4 focused learning modules.
            </p>
            <div className="course-toolbar">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search courses, skills, or instructors..."
              />
              <div className="course-filters">
                <button
                  type="button"
                  className={!activeCategory ? "active" : ""}
                  onClick={() => setActiveCategory("")}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={activeCategory === category ? "active" : ""}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="course-stats">
            <div className="stat-card">
              <strong>{stats.students.toLocaleString()}</strong>
              <span>Total students learning</span>
            </div>
            <div className="stat-card">
              <strong>{stats.courses}</strong>
              <span>Courses available</span>
            </div>
            <div className="stat-card">
              <strong>{stats.completed}</strong>
              <span>Courses completed</span>
            </div>
            <div className="stat-card">
              <strong>{Math.min(categories.length, 6)}</strong>
              <span>Trending technologies</span>
            </div>
          </div>
        </div>

        <div className="course-discovery">
          {loading ? <p className="muted">Loading courses...</p> : null}
          {!loading && filteredCourses.length === 0 ? (
            <p className="muted">No courses found. Try a different search or category.</p>
          ) : null}
          <div className="course-grid">
            {filteredCourses.map((course) => {
              const level = getCourseLevel(course);
              return (
                <div key={course.slug} className="course-card">
                  <div className="course-media">
                    {course.image_url || course.image ? (
                      <img src={course.image_url || course.image} alt={course.title} />
                    ) : null}
                  </div>
                  <div className="course-body">
                    <h3>{course.title}</h3>
                    <p>{course.instructor || "Instructor"}</p>
                    <div className="course-meta">
                      <span className={`badge difficulty ${level.toLowerCase()}`}>{level}</span>
                      <span>* {getCourseRating(course).toFixed(1)}</span>
                      <span>{getCourseStudents(course).toLocaleString()} learners</span>
                    </div>
                    <p className="course-desc">{course.description || "Structured learning path with daily modules."}</p>
                    <div className="course-actions">
                      <Link href={`/learning/${course.slug}`} className="cta-primary">
                        Enroll
                      </Link>
                      <Link href={`/learning/${course.slug}`} className="cta-secondary">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
