import { useEffect, useState } from "react";
import { AppShell } from "../components/layout/app-shell";
import { Button, Input } from "../components/ui";

export default function AdminPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [form, setForm] = useState<any>({
    slug: "",
    title: "",
    instructor: "",
    category: "",
    level: "Beginner",
    description: "",
    image_url: "",
  });
  const [stageForm, setStageForm] = useState<any>({ course_id: "", title: "", position: 0 });
  const [lessonForm, setLessonForm] = useState<any>({
    course_id: "",
    stage_id: "",
    day_number: 1,
    title: "",
    duration: "",
    summary: "",
    content: "",
  });
  const [quizForm, setQuizForm] = useState<any>({
    lesson_id: "",
    question_type: "multiple",
    prompt: "",
    options: "",
    answer: "",
    difficulty: "medium",
  });

  async function readError(res: Response) {
    try {
      const data = await res.json();
      return data?.error || data?.detail || res.statusText;
    } catch {
      return res.statusText;
    }
  }

  async function loadCourses() {
    const res = await fetch("/api/admin/courses");
    if (!res.ok) {
      setNotice({ type: "error", text: `Courses failed: ${await readError(res)}` });
      return;
    }
    const data = await res.json();
    setCourses(data.items || []);
  }

  async function loadStages() {
    const res = await fetch("/api/admin/courses");
    if (!res.ok) return;
    const data = await res.json();
    const courseIds = (data.items || []).map((c: any) => c.id);
    if (!courseIds.length) return;
    const stagesRes = await fetch("/api/admin/courses");
    if (!stagesRes.ok) return;
    const stagesData = await stagesRes.json();
    setStages(stagesData.items || []);
  }

  async function loadLessons() {
    const res = await fetch("/api/admin/lessons");
    if (!res.ok) {
      setNotice({ type: "error", text: `Lessons failed: ${await readError(res)}` });
      return;
    }
    const data = await res.json();
    setLessons(data.items || []);
  }

  async function loadQuizzes() {
    const res = await fetch("/api/admin/quizzes");
    if (!res.ok) {
      setNotice({ type: "error", text: `Quizzes failed: ${await readError(res)}` });
      return;
    }
    const data = await res.json();
    setQuizzes(data.items || []);
  }

  useEffect(() => {
    loadCourses().catch(() => null);
    loadLessons().catch(() => null);
    loadQuizzes().catch(() => null);
  }, []);

  return (
    <AppShell title="Admin Console" subtitle="Manage courses and learning content">
      <section className="admin-page">
        <header className="admin-hero">
          <div>
            <p className="admin-eyebrow">Content Operations</p>
            <h2>Admin Studio</h2>
            <p>Publish courses, stages, lessons, and quizzes with verified access control.</p>
          </div>
          <div className="admin-hero-meta">
            <div>
              <span>Total Courses</span>
              <strong>{courses.length}</strong>
            </div>
            <div>
              <span>Total Lessons</span>
              <strong>{lessons.length}</strong>
            </div>
            <div>
              <span>Total Quizzes</span>
              <strong>{quizzes.length}</strong>
            </div>
          </div>
        </header>

        {notice ? <div className={`admin-notice ${notice.type}`}>{notice.text}</div> : null}

        <div className="admin-grid-forms">
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Create / Update Course</h3>
                <p>Slug, title, and instructor are required before saving.</p>
              </div>
            </div>
            <div className="admin-form admin-form-grid">
              <div className="admin-field">
                <label>Course Slug</label>
                <Input placeholder="ml-foundations" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Course Title</label>
                <Input placeholder="Machine Learning Foundations" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Instructor</label>
                <Input placeholder="Dr. Andrew Ng" value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Category</label>
                <Input placeholder="AI & Data" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Level</label>
                <Input placeholder="Beginner" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Image URL</label>
                <Input placeholder="https://..." value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              </div>
              <div className="admin-field admin-field-full">
                <label>Description</label>
                <textarea
                  className="admin-textarea"
                  placeholder="Describe what learners will build."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="admin-field admin-field-full">
                <Button
                  variant="default"
                  size="lg"
                  className="admin-btn"
                  onClick={async () => {
                    setNotice(null);
                    if (!form.slug || !form.title || !form.instructor) {
                      setNotice({ type: "error", text: "Add slug, title, and instructor before saving." });
                      return;
                    }
                    const res = await fetch("/api/admin/courses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(form),
                    });
                    if (!res.ok) {
                      setNotice({ type: "error", text: `Save failed: ${await readError(res)}` });
                      return;
                    }
                    setNotice({ type: "success", text: "Course saved successfully." });
                    await loadCourses();
                  }}
                >
                  Save Course
                </Button>
              </div>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Create Stage</h3>
                <p>Use the course ID from the courses list.</p>
              </div>
            </div>
            <div className="admin-form">
              <div className="admin-field">
                <label>Course ID</label>
                <Input placeholder="UUID" value={stageForm.course_id} onChange={(e) => setStageForm({ ...stageForm, course_id: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Stage Title</label>
                <Input placeholder="Stage 1: Fundamentals" value={stageForm.title} onChange={(e) => setStageForm({ ...stageForm, title: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Position</label>
                <Input placeholder="0" value={stageForm.position} onChange={(e) => setStageForm({ ...stageForm, position: e.target.value })} />
              </div>
              <Button
                variant="default"
                size="lg"
                className="admin-btn"
                onClick={async () => {
                  setNotice(null);
                  if (!stageForm.course_id || !stageForm.title) {
                    setNotice({ type: "error", text: "Course ID and title are required for stages." });
                    return;
                  }
                  const res = await fetch("/api/admin/courses", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(stageForm),
                  });
                  if (!res.ok) {
                    setNotice({ type: "error", text: `Stage failed: ${await readError(res)}` });
                    return;
                  }
                  setNotice({ type: "success", text: "Stage created successfully." });
                  await loadStages();
                }}
              >
                Save Stage
              </Button>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Create Lesson</h3>
                <p>Attach lessons to a course and optional stage.</p>
              </div>
            </div>
            <div className="admin-form admin-form-grid">
              <div className="admin-field">
                <label>Course ID</label>
                <Input placeholder="UUID" value={lessonForm.course_id} onChange={(e) => setLessonForm({ ...lessonForm, course_id: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Stage ID</label>
                <Input placeholder="Optional UUID" value={lessonForm.stage_id} onChange={(e) => setLessonForm({ ...lessonForm, stage_id: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Day Number</label>
                <Input placeholder="1" value={lessonForm.day_number} onChange={(e) => setLessonForm({ ...lessonForm, day_number: Number(e.target.value) })} />
              </div>
              <div className="admin-field">
                <label>Lesson Title</label>
                <Input placeholder="Intro to Supervised Learning" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Duration</label>
                <Input placeholder="12 min" value={lessonForm.duration} onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })} />
              </div>
              <div className="admin-field admin-field-full">
                <label>Summary</label>
                <Input placeholder="Short summary" value={lessonForm.summary} onChange={(e) => setLessonForm({ ...lessonForm, summary: e.target.value })} />
              </div>
              <div className="admin-field admin-field-full">
                <label>Content</label>
                <textarea
                  className="admin-textarea"
                  placeholder="Lesson body and prompts."
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                />
              </div>
              <div className="admin-field admin-field-full">
                <Button
                  variant="default"
                  size="lg"
                  className="admin-btn"
                  onClick={async () => {
                    setNotice(null);
                    if (!lessonForm.course_id || !lessonForm.title || !lessonForm.day_number) {
                      setNotice({ type: "error", text: "Course ID, title, and day number are required." });
                      return;
                    }
                    const res = await fetch("/api/admin/lessons", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(lessonForm),
                    });
                    if (!res.ok) {
                      setNotice({ type: "error", text: `Lesson failed: ${await readError(res)}` });
                      return;
                    }
                    setNotice({ type: "success", text: "Lesson created successfully." });
                    await loadLessons();
                  }}
                >
                  Save Lesson
                </Button>
              </div>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Create Quiz Question</h3>
                <p>Link quiz prompts to a lesson.</p>
              </div>
            </div>
            <div className="admin-form admin-form-grid">
              <div className="admin-field">
                <label>Lesson ID</label>
                <Input placeholder="UUID" value={quizForm.lesson_id} onChange={(e) => setQuizForm({ ...quizForm, lesson_id: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Type</label>
                <Input placeholder="multiple/reasoning/applied" value={quizForm.question_type} onChange={(e) => setQuizForm({ ...quizForm, question_type: e.target.value })} />
              </div>
              <div className="admin-field admin-field-full">
                <label>Prompt</label>
                <Input placeholder="Question prompt" value={quizForm.prompt} onChange={(e) => setQuizForm({ ...quizForm, prompt: e.target.value })} />
              </div>
              <div className="admin-field admin-field-full">
                <label>Options</label>
                <Input placeholder="Option A, Option B, Option C" value={quizForm.options} onChange={(e) => setQuizForm({ ...quizForm, options: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Answer</label>
                <Input placeholder="Option A" value={quizForm.answer} onChange={(e) => setQuizForm({ ...quizForm, answer: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Difficulty</label>
                <Input placeholder="medium" value={quizForm.difficulty} onChange={(e) => setQuizForm({ ...quizForm, difficulty: e.target.value })} />
              </div>
              <div className="admin-field admin-field-full">
                <Button
                  variant="default"
                  size="lg"
                  className="admin-btn"
                  onClick={async () => {
                    setNotice(null);
                    if (!quizForm.lesson_id || !quizForm.prompt || !quizForm.answer) {
                      setNotice({ type: "error", text: "Lesson ID, prompt, and answer are required." });
                      return;
                    }
                    const res = await fetch("/api/admin/quizzes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ...quizForm,
                        options: quizForm.options ? quizForm.options.split(",").map((o: string) => o.trim()) : null,
                      }),
                    });
                    if (!res.ok) {
                      setNotice({ type: "error", text: `Quiz failed: ${await readError(res)}` });
                      return;
                    }
                    setNotice({ type: "success", text: "Quiz question saved successfully." });
                    await loadQuizzes();
                  }}
                >
                  Save Quiz
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-lists">
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Courses</h3>
                <p>{courses.length} total</p>
              </div>
            </div>
            <div className="admin-list">
              {courses.map((course) => (
                <div key={course.id} className="admin-row">
                  <div>
                    <strong>{course.title}</strong>
                    <span>{course.slug}</span>
                  </div>
                  <div className="admin-actions">
                    <Button variant="secondary" size="sm" onClick={() => setForm(course)}>
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="admin-btn-outline"
                      onClick={async () => {
                        const res = await fetch("/api/admin/courses", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: course.id }),
                        });
                        if (!res.ok) {
                          setNotice({ type: "error", text: `Delete failed: ${await readError(res)}` });
                          return;
                        }
                        await loadCourses();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Lessons</h3>
                <p>{lessons.length} total</p>
              </div>
            </div>
            <div className="admin-list">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="admin-row">
                  <div>
                    <strong>{lesson.title}</strong>
                    <span>Day {lesson.day_number}</span>
                  </div>
                  <div className="admin-actions">
                    <Button variant="secondary" size="sm" onClick={() => setLessonForm(lesson)}>
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="admin-btn-outline"
                      onClick={async () => {
                        const res = await fetch("/api/admin/lessons", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: lesson.id }),
                        });
                        if (!res.ok) {
                          setNotice({ type: "error", text: `Delete failed: ${await readError(res)}` });
                          return;
                        }
                        await loadLessons();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Quiz Questions</h3>
                <p>{quizzes.length} total</p>
              </div>
            </div>
            <div className="admin-list">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="admin-row">
                  <div>
                    <strong>{quiz.prompt}</strong>
                    <span>{quiz.question_type}</span>
                  </div>
                  <div className="admin-actions">
                    <Button variant="secondary" size="sm" onClick={() => setQuizForm(quiz)}>
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="admin-btn-outline"
                      onClick={async () => {
                        const res = await fetch("/api/admin/quizzes", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: quiz.id }),
                        });
                        if (!res.ok) {
                          setNotice({ type: "error", text: `Delete failed: ${await readError(res)}` });
                          return;
                        }
                        await loadQuizzes();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
