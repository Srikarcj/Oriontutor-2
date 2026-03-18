import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/layout/app-shell";
import QuizComponent from "../../components/quiz-component";

type ModuleItem = {
  id: string;
  module_number: number;
  title: string;
  concept: string;
  explanation?: string | null;
  level_type: string;
  locked: boolean;
  completed?: boolean;
};

export default function CoursePage() {
  const router = useRouter();
  const courseId = typeof router.query.id === "string" ? router.query.id : "";
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [skillLevel, setSkillLevel] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [recommendedModuleId, setRecommendedModuleId] = useState<string | null>(null);
  const displayLevel = skillLevel ? `${skillLevel[0].toUpperCase()}${skillLevel.slice(1)}` : "Unassigned";

  const loadModules = async () => {
    if (!courseId) return;
    setLoading(true);
    const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/modules`);
    if (res.ok) {
      const data = await res.json();
      setCourse(data.course);
      setModules(data.modules || []);
      setSkillLevel(data.skill_level || null);
      setLoading(false);
      return data;
    }
    setLoading(false);
    return null;
  };

  useEffect(() => {
    loadModules();
  }, [courseId]);

  const openQuiz = async () => {
    if (!courseId) return;
    setQuizLoading(true);
    setQuizResult(null);
    setRecommendedModuleId(null);
    const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/quiz-attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      setQuiz({
        title: "Skill Assessment",
        questions: data.questions || [],
      });
      setQuizOpen(true);
    }
    setQuizLoading(false);
  };

  const submitQuiz = async (answers: Record<string, string>) => {
    if (!courseId) return;
    const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/quiz-attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (res.ok) {
      const data = await res.json();
      setQuizResult(data);
      const enrollRes = await fetch(`/api/courses/${encodeURIComponent(courseId)}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill_level: data.skill_level,
          quiz_score: data.score,
        }),
      });
      if (enrollRes.ok) {
        const enrollData = await enrollRes.json();
        const latest = await loadModules();
        const nextModule = pickRecommendedModule(latest?.modules || [], enrollData?.skill_level);
        if (nextModule?.id) {
          setRecommendedModuleId(nextModule.id);
          setQuizOpen(false);
          router.push(`/course/${encodeURIComponent(courseId)}/module/${nextModule.id}`);
        }
      }
    }
  };

  const progress = useMemo(() => {
    if (!modules.length) return 0;
    const completed = modules.filter((m) => m.completed).length;
    return Math.round((completed / modules.length) * 100);
  }, [modules]);

  const pickRecommendedModule = (items: ModuleItem[], level?: string | null) => {
    if (!items.length) return null;
    const normalized = (level || "").toLowerCase();
    if (normalized === "beginner") {
      return items.find((m) => m.level_type === "beginner") || items[0];
    }
    const intermediate = items.find((m) => m.level_type === "intermediate" && m.module_number === 1);
    return intermediate || items.find((m) => !m.locked) || items[0];
  };

  return (
    <AppShell title={course?.title || "Course"} subtitle="Adaptive learning pathway personalized to your skill level.">
      {loading ? <p>Loading course...</p> : null}
      {!loading && !course ? <p>Course not found.</p> : null}
      {!loading && course ? (
        <div className="course-detail">
          <div className="course-title-card">
            <div className="course-title-label">Course</div>
            <h1 className="course-title">{course.title || "Course"}</h1>
            <p className="course-title-sub">
              {course.category || "AI"} · {course.difficulty || "Intermediate"}
            </p>
          </div>
          <div className="course-info">
            <p>{course.description}</p>
            <div className="course-meta-row">
              <span className="badge-trending">Trending</span>
              <span className="difficulty">{course.difficulty || "Intermediate"}</span>
            </div>
            <div className="course-level">
              Skill level: <span>{displayLevel}</span>
            </div>
            <div className="course-progress">
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <span>{progress}% modules completed</span>
            </div>
            <button className="course-enroll" onClick={openQuiz} disabled={quizLoading}>
              {quizLoading ? "Loading quiz..." : "Enroll & Take Skill Quiz"}
            </button>
          </div>

          <section className="course-content">
            <h3>Modules</h3>
            {!modules.length ? <p>No modules yet.</p> : null}
            {modules.map((module) => (
              <div key={module.id} className={`lesson-card ${module.locked ? "locked" : "unlocked"}`}>
                <div className="lesson-header">
                  <h4>
                    Module {module.module_number}: {module.title}
                  </h4>
                  <span className={`level-pill ${module.level_type}`}>{module.level_type}</span>
                </div>
                <p className="concept">{module.concept}</p>
                {module.locked ? (
                  <p className="locked-text">Enroll and unlock the recommended path to view this explanation.</p>
                ) : (
                  <>
                    <p>{module.explanation}</p>
                    <button
                      className="module-open"
                      onClick={() => router.push(`/course/${encodeURIComponent(courseId)}/module/${module.id}`)}
                    >
                      Open Module
                    </button>
                  </>
                )}
              </div>
            ))}
          </section>
        </div>
      ) : null}

      {quizOpen ? (
        <div className="quiz-modal">
          <div className="quiz-modal-content">
            <button className="quiz-close" onClick={() => setQuizOpen(false)}>
              Close
            </button>
            {quiz ? <QuizComponent quiz={quiz} onSubmit={submitQuiz} result={quizResult} /> : null}
            {quizResult ? (
              <div className="quiz-result">
                <h4>Result</h4>
                <p>
                  Score: {Math.round(quizResult.score || 0)}% - Level:{" "}
                  <strong>{quizResult.skill_level}</strong>
                </p>
                <p className="recommendation">
                  {quizResult.skill_level === "beginner"
                    ? "We recommend starting with the Beginner Foundation Module."
                    : quizResult.skill_level === "advanced"
                    ? "You will follow the Intermediate -> Advanced pathway with deeper projects."
                    : "You can start directly with the main course modules."}
                </p>
                {recommendedModuleId ? (
                  <button
                    className="module-open"
                    onClick={() => router.push(`/course/${encodeURIComponent(courseId)}/module/${recommendedModuleId}`)}
                  >
                    Go to Recommended Module
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}



