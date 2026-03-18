import Link from "next/link";
import { getCourseIcon } from "../lib/course-icons";

export type CourseCardProps = {
  course: {
    id?: string;
    slug?: string;
    title?: string;
    category?: string;
    description?: string;
    difficulty?: string;
    image_url?: string;
    progress_pct?: number;
  };
};

export default function CourseCard({ course }: CourseCardProps) {
  const slug = course.slug || course.id || "";
  const themeKey = (course.slug || "").toLowerCase();
  const themeClass = themeKey ? `course-theme-${themeKey}` : "";
  const symbolName =
    (course as any).symbol ||
    (themeKey === "genai-dev"
      ? "Sparkles"
      : themeKey === "fullstack-ai"
      ? "Code"
      : themeKey === "ai-agents"
      ? "Workflow"
      : themeKey === "mlops-deploy"
      ? "Cloud"
      : themeKey === "data-eng"
      ? "Database"
      : themeKey === "prompt-adv"
      ? "Brain"
      : "Sparkles");
  const Icon = getCourseIcon(String(symbolName));
  return (
    <div className={`course-card ${themeClass}`}>
      <div className="course-media">
        {course.image_url ? (
          <img src={course.image_url} alt={course.title || "Course"} />
        ) : (
          <div className="course-card-placeholder" />
        )}
        <div className="course-name-badge">{course.title || "Course"}</div>
        <div className="course-symbol-badge" aria-hidden="true">
          <Icon size={16} />
        </div>
      </div>
      <div className="course-body">
        <div className="course-meta">
          <span className="badge-trending">Trending</span>
          <span>{course.category || "Course"}</span>
          <span className="difficulty">{course.difficulty || "Intermediate"}</span>
          {typeof course.progress_pct === "number" ? (
            <span className={`badge-progress ${course.progress_pct >= 100 ? "done" : ""}`}>
              {course.progress_pct >= 100 ? "Completed" : `Progress ${course.progress_pct}%`}
            </span>
          ) : null}
        </div>
        <h3>{course.title || "Untitled Course"}</h3>
        <p>{course.description || "Adaptive course content tailored to your learning level."}</p>
        <Link href={`/course/${encodeURIComponent(slug)}`} className="cta-primary">
          View course
        </Link>
      </div>
    </div>
  );
}
