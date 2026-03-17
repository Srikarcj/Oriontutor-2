import Link from "next/link";

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
  return (
    <div className="course-card">
      <div className="course-media">
        {course.image_url ? <img src={course.image_url} alt={course.title || "Course"} /> : <div className="course-card-placeholder" />}
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
