import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useClerk, useUser } from "@clerk/nextjs";
import { AppShell } from "../../components/layout/app-shell";
import { getCourseIcon } from "../../lib/course-icons";
import { getCourseBySlug } from "../../lib/course-data";
import { buildDayModules } from "../../lib/module-generator";
import { supabaseClient } from "../../lib/client/supabase";

const STORAGE_KEY = "oriontutor-course-progress";
const MODULE_STORAGE_KEY = "oriontutor-module-progress";
const LOCAL_ENROLL_KEY = "oriontutor-local-enrollments";

type CourseProgress = Record<string, { passedDays: number[]; scores: Record<string, number> }>;
type ModuleProgress = Record<string, Record<number, string[]>>;

type ProgressRow = {
  course_slug: string;
  passed_days: number[];
  scores: Record<string, number>;
};

type CourseLessonRow = {
  id: string;
  day_number: number;
  title: string;
  duration: string | null;
  keywords: string[] | null;
  summary: string | null;
  content: string | null;
  stage_id: string | null;
};

type CourseStageRow = {
  id: string;
  title: string;
  position: number;
};

type CourseResponse = {
  id: string;
  slug: string;
  title: string;
  instructor: string;
  rating: number;
  students: number;
  category: string;
  level: string;
  description: string;
  image_url: string;
  stages: CourseStageRow[];
  lessons: CourseLessonRow[];
  materials: Array<{
    id: string;
    material_type: string;
    title: string;
    description: string | null;
    size: string | null;
    url: string | null;
    storage_path: string | null;
  }>;
  enrollments_count: number;
  enrollment: any | null;
};

function toLocalCourseResponse(slug: string): CourseResponse | null {
  const local = getCourseBySlug(slug);
  if (!local) return null;

  const stages: CourseStageRow[] = local.stages.map((stage, index) => ({
    id: `local-stage-${local.slug}-${index + 1}`,
    title: stage.title,
    position: index + 1,
  }));

  const lessons: CourseLessonRow[] = local.stages.flatMap((stage, stageIndex) =>
    stage.days.map((day) => ({
      id: `local-lesson-${local.slug}-${day.day}`,
      day_number: day.day,
      title: day.title,
      duration: day.duration,
      keywords: day.keywords,
      summary: null,
      content: null,
      stage_id: stages[stageIndex]?.id || null,
    }))
  );

  return {
    id: `local-${local.slug}`,
    slug: local.slug,
    title: local.title,
    instructor: local.instructor,
    rating: local.rating,
    students: local.students,
    category: local.category,
    level: local.level,
    description: local.description,
    image_url: local.image,
    stages,
    lessons,
    materials: local.materials.map((material) => ({
      id: material.id,
      material_type: material.type,
      title: material.title,
      description: material.description || null,
      size: material.size || null,
      url: material.url || null,
      storage_path: null,
    })),
    enrollments_count: 0,
    enrollment: null,
  };
}

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
    acc[row.course_slug] = { passedDays: row.passed_days || [], scores: row.scores || {} };
    return acc;
  }, {} as CourseProgress);
}

function loadModuleProgress(): ModuleProgress {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(MODULE_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ModuleProgress;
  } catch {
    return {};
  }
}

function persistModuleProgress(next: ModuleProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODULE_STORAGE_KEY, JSON.stringify(next));
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

function persistLocalEnrollments(next: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_ENROLL_KEY, JSON.stringify(next));
}

export default function LearningDetailPage() {
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();
  const safeMode = true;
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<CourseProgress>({});
  const [activeDay, setActiveDay] = useState(1);
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [localEnrollment, setLocalEnrollment] = useState(false);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress>({});
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const learningShellRef = useRef<HTMLDivElement | null>(null);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState<string | null>(null);
  const [assistantUploads, setAssistantUploads] = useState<File[]>([]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const assistantApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  const courseSlug = typeof router.query.slug === "string" ? router.query.slug : "";

  const stagesById = useMemo(() => {
    const map = new Map<string, CourseStageRow>();
    (course?.stages || []).forEach((stage) => map.set(stage.id, stage));
    return map;
  }, [course?.stages]);

  const allLessons = useMemo(() => {
    if (!course) return [];
    return (course.lessons || []).map((lesson) => ({
      ...lesson,
      stage: lesson.stage_id ? stagesById.get(lesson.stage_id)?.title || "" : "",
    }));
  }, [course, stagesById]);

  useEffect(() => {
    setMounted(true);
    if (safeMode) return;
    setModuleProgress(loadModuleProgress());
  }, []);

  useEffect(() => {
    if (safeMode) {
      setLocalEnrollment(false);
      return;
    }
    if (!courseSlug) return;
    const enrolled = loadLocalEnrollments().includes(courseSlug);
    setLocalEnrollment(enrolled);
  }, [courseSlug, safeMode]);

  useEffect(() => {
    if (!courseSlug) return;
    let active = true;
    const loadCourse = async () => {
      setLoadingCourse(true);
      try {
        const res = await fetch(`/api/courses/${courseSlug}`);
        if (!res.ok) throw new Error("Failed to load course");
        const data = await res.json();
        if (!data || data.error) throw new Error("Invalid course payload");
        if (active) {
          setCourse(data);
          setLocalEnrollment(Boolean(data?.enrollment));
        }
      } catch {
        if (!active) return;
        const localCourse = toLocalCourseResponse(courseSlug);
        setCourse(localCourse);
      } finally {
        if (active) setLoadingCourse(false);
      }
    };
    loadCourse();
    return () => {
      active = false;
    };
  }, [courseSlug]);

  useEffect(() => {
    if (!mounted) return;

    async function hydrate() {
      if (safeMode) {
        setProgress({});
        return;
      }
      if (!user || !supabaseClient) {
        setProgress(loadLocal());
        return;
      }
      try {
        const res = await fetch("/api/progress/get");
        if (!res.ok) throw new Error("progress");
        const data = await res.json();
        setProgress(toProgress(data.items || []));
      } catch {
        setProgress(loadLocal());
      }
    }

    hydrate();

    let channel: any = null;
    if (user && supabaseClient) {
      channel = supabaseClient
        .channel("progress-course")
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
      if (channel) supabaseClient?.removeChannel(channel);
    };
  }, [mounted, user, safeMode]);

  const courseProgress = course && progress[course.slug] ? progress[course.slug] : { passedDays: [], scores: {} };
  const unlockedDay = courseProgress.passedDays.length ? Math.max(...courseProgress.passedDays) + 1 : 1;
  const isEnrolled = Boolean(course?.enrollment || localEnrollment);

  if (!loadingCourse && !course) {
    return (
      <AppShell title="Learning" subtitle="Course not found">
        <p className="muted">We could not locate the course. Please return to the learning hub.</p>
      </AppShell>
    );
  }

  const Icon = getCourseIcon(course?.category ? "Brain" : "Book");
  const activeLesson = allLessons.find((lesson: any) => lesson.day_number === activeDay) || allLessons[0];
  const isUnlocked = activeDay <= unlockedDay;
  const activeScore = courseProgress.scores[activeDay];
  const dayModules = safeMode
    ? []
    : course && activeLesson
    ? buildDayModules({
        courseTitle: course.title,
        courseSlug: course.slug,
        dayTitle: activeLesson.title,
        dayNumber: activeLesson.day_number,
      })
    : [];
  const completedModuleIds = safeMode
    ? []
    : course && moduleProgress[course.slug]?.[activeDay]
    ? moduleProgress[course.slug][activeDay]
    : [];
  const allModulesComplete = dayModules.length > 0 && completedModuleIds.length >= dayModules.length;
  const activeModule = dayModules[activeModuleIndex] || dayModules[0];

  async function handleAskAssistant(prompt: string, files: File[] = []) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setAssistantLoading(true);
    setAssistantError(null);
    try {
      const formData = new FormData();
      formData.append("prompt", trimmed);
      files.forEach((file) => formData.append("uploads", file));
      const endpoint = `${assistantApiBase.replace(/\/$/, "")}/api/assistant`;
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail || data?.error || "Assistant request failed";
        throw new Error(detail);
      }
      setAssistantAnswer(data.answer || "No answer returned.");
    } catch (err: any) {
      setAssistantError(err?.message || "Unable to reach the assistant.");
    } finally {
      setAssistantLoading(false);
    }
  }

  useEffect(() => {
    if (safeMode || !course || !dayModules.length) return;
    const completed = moduleProgress[course.slug]?.[activeDay] || [];
    const nextIndex = Math.min(completed.length, Math.max(dayModules.length - 1, 0));
    setActiveModuleIndex(nextIndex);
  }, [course?.slug, activeDay, dayModules.length, safeMode]);

  useEffect(() => {
    if (!course || !router.asPath.includes("#learning-shell")) return;
    const el = learningShellRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [course, router.asPath]);

  function handleDaySelect(day: number) {
    if (day > unlockedDay) return;
    setActiveDay(day);
  }

  function handleCompleteModule(moduleId: string) {
    if (!course) return;
    setModuleProgress((prev) => {
      const courseMap = { ...(prev[course.slug] || {}) };
      const completed = new Set(courseMap[activeDay] || []);
      completed.add(moduleId);
      courseMap[activeDay] = Array.from(completed);
      const next = { ...prev, [course.slug]: courseMap };
      persistModuleProgress(next);
      return next;
    });
    if (dayModules.length) {
      setActiveModuleIndex((prev) => Math.min(prev + 1, dayModules.length - 1));
    }
  }

  return (
    <AppShell title={course?.title || "Learning"} subtitle={course ? `Instructor: ${course.instructor}` : ""}>
      <section className="course-detail">
        <div className="course-hero">
          <div>
            <span className="course-badge">
              <Icon size={14} />
              {course?.category}
            </span>
            <h2>{course?.title}</h2>
            <p>{course?.description}</p>
            <div className="course-hero-meta">
              <span>Rating {course?.rating?.toFixed?.(1) || "4.8"}</span>
              <span>{course?.enrollments_count?.toLocaleString?.() || 0} enrolled</span>
              <span>Level {course?.level}</span>
            </div>
            <div className="course-hero-actions">
              {safeMode ? <span className="muted">Safe mode enabled.</span> : null}
              <button
                className="cta-primary"
                type="button"
                onClick={() => {
                  if (!course) return;
                  if (!isEnrolled) {
                    setLocalEnrollment(true);
                    const next = Array.from(new Set([...loadLocalEnrollments(), course.slug]));
                    persistLocalEnrollments(next);
                  }
                  const nextDay = Math.min(unlockedDay, Math.max(allLessons.length, 1));
                  setActiveDay(nextDay);
                  setActiveModuleIndex(0);
                  learningShellRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Continue Learning
              </button>
              <button
                className="cta-secondary"
                type="button"
                disabled={enrolling || isEnrolled}
                onClick={async () => {
                  if (!course) return;
                  setEnrollError(null);
                  if (!user) {
                    setLocalEnrollment(true);
                    const next = Array.from(new Set([...loadLocalEnrollments(), course.slug]));
                    persistLocalEnrollments(next);
                    return;
                  }
                  setEnrolling(true);
                  try {
                    const response = await fetch("/api/enrollments", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ course_slug: course.slug }),
                    });
                    if (response.status === 401) {
                      openSignIn();
                      throw new Error("Unauthorized");
                    }
                    if (!response.ok) throw new Error("Enrollment failed");
                    const updatedRes = await fetch(`/api/courses/${course.slug}`);
                    const updated = updatedRes.ok ? await updatedRes.json() : null;
                    if (updated) setCourse(updated);
                    setLocalEnrollment(true);
                    const next = Array.from(new Set([...loadLocalEnrollments(), course.slug]));
                    persistLocalEnrollments(next);
                  } catch {
                    setLocalEnrollment(true);
                    const next = Array.from(new Set([...loadLocalEnrollments(), course.slug]));
                    persistLocalEnrollments(next);
                    setEnrollError("Unable to sync enrollment. Saved locally.");
                  } finally {
                    setEnrolling(false);
                  }
                }}
              >
                {isEnrolled ? "Enrolled" : enrolling ? "Adding..." : "Add to My Learning"}
              </button>
              {enrollError ? <span className="muted">{enrollError}</span> : null}
            </div>
            <div className="course-progress-bar">
              <span>Progress</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((courseProgress.passedDays.length / Math.max(allLessons.length, 1)) * 100, 100)}%` }}
                />
              </div>
              <em>
                {courseProgress.passedDays.length} of {allLessons.length} lessons cleared
              </em>
            </div>
          </div>
          <div className="course-hero-media">
            {course?.image_url ? <img src={course.image_url} alt={course.title} /> : null}
          </div>
        </div>

        <div className="course-roadmap">
          <div className="course-roadmap-header">
            <div>
              <h3>Course Roadmap</h3>
              <p>Preview the daily learning path before you start.</p>
            </div>
            <div className="roadmap-meta">
              <span>{allLessons.length} days</span>
              <span>{allLessons.length * 4} modules</span>
            </div>
          </div>
          <div className="roadmap-grid">
            {allLessons
              .slice(0, 6)
              .map((lesson: any) => (
                <button
                  key={`roadmap-${lesson.day_number}`}
                  className={`roadmap-item ${lesson.day_number === activeDay ? "active" : ""}`}
                  type="button"
                  onClick={() => handleDaySelect(lesson.day_number)}
                >
                  <span>Day {lesson.day_number}</span>
                  <strong>{lesson.title}</strong>
                </button>
              ))}
          </div>
        </div>

        <div className="learning-shell" id="learning-shell" ref={learningShellRef}>
          <aside className="learning-sidebar">
            <div className="learning-day-header">
              <span>Current Day</span>
              <strong>
                Day {activeLesson?.day_number} - {activeLesson?.title}
              </strong>
              <em>{activeLesson?.duration || "Estimated 30 min"}</em>
            </div>
            <div className="learning-day-list">
              {allLessons.map((lesson: any) => {
                const locked = lesson.day_number > unlockedDay;
                return (
                  <button
                    key={`day-${lesson.day_number}`}
                    className={`learning-day-item ${lesson.day_number === activeDay ? "active" : ""}`}
                    type="button"
                    onClick={() => handleDaySelect(lesson.day_number)}
                    disabled={locked}
                  >
                    <span>Day {lesson.day_number}</span>
                    <strong>{lesson.title}</strong>
                    {locked ? <em>Locked</em> : null}
                  </button>
                );
              })}
            </div>
            <div className="learning-modules">
              <p>Modules</p>
              {dayModules.map((module, index) => {
                const completed = completedModuleIds.includes(module.id);
                const locked = index > completedModuleIds.length;
                return (
                  <button
                    key={module.id}
                    className={`module-item ${index === activeModuleIndex ? "active" : ""} ${completed ? "done" : ""}`}
                    type="button"
                    onClick={() => {
                      if (locked) return;
                      setActiveModuleIndex(index);
                    }}
                    disabled={locked}
                  >
                    <span>Module {index + 1}</span>
                    <strong>{module.title}</strong>
                    {completed ? <i>Completed</i> : locked ? <i>Locked</i> : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="learning-content">
            <div className="module-viewer">
              <div className="module-header">
                <div>
                  <p>Module {activeModuleIndex + 1}</p>
                  <h3>{activeModule?.title}</h3>
                </div>
                {activeModule && completedModuleIds.includes(activeModule.id) ? (
                  <span className="module-status done">Completed</span>
                ) : (
                  <span className="module-status">In Progress</span>
                )}
              </div>
              {activeModule ? (
                <>
                  <p className="module-explanation">{activeModule.explanation}</p>
                  <div className="module-grid">
                    <div>
                      <h4>Key Concepts</h4>
                      <ul>
                        {activeModule.concepts.map((concept) => (
                          <li key={concept}>{concept}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4>Examples</h4>
                      <ul>
                        {activeModule.examples.map((example) => (
                          <li key={example}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="module-notes">
                    <h4>Important Notes</h4>
                    <ul>
                      {activeModule.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    className="cta-primary"
                    type="button"
                    onClick={() => handleCompleteModule(activeModule.id)}
                    disabled={completedModuleIds.includes(activeModule.id)}
                  >
                    {completedModuleIds.includes(activeModule.id) ? "Module Completed" : "Mark Module Complete"}
                  </button>
                </>
              ) : (
                <p className="muted">Modules will appear once lessons are configured.</p>
              )}
            </div>

            <div className="quiz-panel">
              <div>
                <h3>Daily Quiz</h3>
                <p>Unlocks after all modules are completed.</p>
              </div>
              <div className="test-panel">
                <div>
                  <strong>Modules</strong>
                  <span>{completedModuleIds.length}/{dayModules.length} complete</span>
                </div>
                <div>
                  <strong>Last Score</strong>
                  <span>{activeScore ? `${activeScore}%` : "Not attempted"}</span>
                </div>
                {isUnlocked && allModulesComplete ? (
                  <Link href={`/learning/${course?.slug}/exam/${activeLesson?.day_number || 1}`} className="cta-primary small">
                    Start Quiz
                  </Link>
                ) : (
                  <span className="cta-primary small disabled">Complete modules to unlock</span>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="assistant-panel">
          <div className="assistant-header">
            <div>
              <h3>Advanced AI Assistant</h3>
              <p>Tap any concept for a clear explanation, or upload a question.</p>
            </div>
            <span className="assistant-badge">Concept Tutor</span>
          </div>

          <div className="assistant-concepts">
            {(activeModule?.concepts || []).map((concept) => (
              <button
                key={concept}
                type="button"
                className="assistant-chip"
                onClick={() => {
                  setAssistantPrompt(concept);
                  handleAskAssistant(`Explain "${concept}" clearly with a simple example.`, assistantUploads);
                }}
              >
                {concept}
              </button>
            ))}
          </div>

          <div className="assistant-body">
            <div className="assistant-inputs">
              <label className="assistant-label">Ask a question</label>
              <input
                value={assistantPrompt}
                onChange={(event) => setAssistantPrompt(event.target.value)}
                placeholder="Explain this concept in simple words..."
              />
              <div className="assistant-actions">
                <button
                  className="cta-primary"
                  type="button"
                  onClick={() => handleAskAssistant(assistantPrompt, assistantUploads)}
                  disabled={assistantLoading}
                >
                  {assistantLoading ? "Explaining..." : "Explain Clearly"}
                </button>
                <button
                  className="cta-secondary"
                  type="button"
                  onClick={() => {
                    setAssistantPrompt("");
                    setAssistantAnswer(null);
                    setAssistantUploads([]);
                    setAssistantError(null);
                  }}
                  disabled={assistantLoading}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="assistant-upload">
              <label className="assistant-label">Upload an image or file</label>
              <input
                type="file"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setAssistantUploads(files);
                  if (files.length) {
                    setAssistantAnswer("Upload received. Ask your question and I will answer from the file.");
                  }
                }}
              />
              {assistantUploads.length ? (
                <div className="assistant-upload-list">
                  {assistantUploads.map((file) => (
                    <span key={`${file.name}-${file.size}`}>{file.name}</span>
                  ))}
                </div>
              ) : (
                <p className="muted">Supported: images, PDFs, and text files.</p>
              )}
            </div>
          </div>

          <div className="assistant-response">
            <h4>Assistant Answer</h4>
            <div className="assistant-answer">
              {assistantError ? (
                <p className="muted">{assistantError}</p>
              ) : assistantAnswer ? (
                assistantAnswer.split("\n").map((line) => <p key={line}>{line}</p>)
              ) : (
                <p className="muted">Select a concept or ask a question to get a clear explanation.</p>
              )}
            </div>
          </div>
        </div>

        <LiveTracking
          enabled={Boolean(!safeMode && mounted && course && user)}
          courseSlug={course?.slug}
          activeDay={activeLesson?.day_number || activeDay}
          unlockedDay={unlockedDay}
        />
      </section>

    </AppShell>
  );
}

function LiveTracking({
  enabled,
  courseSlug,
  activeDay,
  unlockedDay,
}: {
  enabled: boolean;
  courseSlug?: string;
  activeDay: number;
  unlockedDay: number;
}) {
  const [secondsSpent, setSecondsSpent] = useState(0);
  const secondsRef = useRef(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    secondsRef.current = 0;
    setSecondsSpent(0);
  }, [courseSlug, activeDay]);

  useEffect(() => {
    if (!enabled || !visible) return;
    const timer = setInterval(() => {
      secondsRef.current += 5;
      setSecondsSpent((prev) => prev + 5);
    }, 5000);
    return () => clearInterval(timer);
  }, [enabled, courseSlug, activeDay, visible]);

  useEffect(() => {
    if (!enabled || !courseSlug || !visible) return;
    const interval = setInterval(() => {
      fetch("/api/progress/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_slug: courseSlug,
          day: activeDay,
          seconds_spent: secondsRef.current,
        }),
      }).catch(() => null);
    }, 30000);
    return () => clearInterval(interval);
  }, [enabled, courseSlug, activeDay, visible]);

  useEffect(() => {
    const handleVisibility = () => setVisible(document.visibilityState === "visible");
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <div className="course-live">
      <div>
        <h3>Live Learning Tracking</h3>
        <p>Session time updates every second.</p>
      </div>
      <div className="live-grid">
        <div className="live-card">
          <strong>Current Lesson</strong>
          <span>Day {activeDay}</span>
        </div>
        <div className="live-card">
          <strong>Time Spent</strong>
          <span>{Math.floor(secondsSpent / 60)}m {secondsSpent % 60}s</span>
        </div>
        <div className="live-card">
          <strong>Unlocked</strong>
          <span>Day {unlockedDay}</span>
        </div>
      </div>
    </div>
  );
}
