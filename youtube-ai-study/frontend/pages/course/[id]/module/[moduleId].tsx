import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../../../components/layout/app-shell";

type PracticeQuestion = {
  id?: string;
  question: string;
  options: string[];
  correct?: string;
  explanation?: string;
};

type ModuleDetail = {
  id: string;
  module_number: number;
  title: string;
  concept: string;
  level_type: string;
  estimated_time?: number | null;
  learning_objectives?: string | null;
  introduction?: string | null;
  explanation?: string | null;
  examples?: string | null;
  practice_questions?: any;
  practice_answers?: any;
  summary?: string | null;
  advanced_content?: string | null;
  locked: boolean;
  completed?: boolean;
  prev_module_id?: string | null;
  next_module_id?: string | null;
  progress_pct?: number | null;
};

export default function ModulePage() {
  const router = useRouter();
  const courseId = typeof router.query.id === "string" ? router.query.id : "";
  const moduleId = typeof router.query.moduleId === "string" ? router.query.moduleId : "";
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [moduleItem, setModuleItem] = useState<ModuleDetail | null>(null);
  const [skillLevel, setSkillLevel] = useState<string | null>(null);
  const [practiceAnswer, setPracticeAnswer] = useState<Record<number, string>>({});
  const [practiceFeedback, setPracticeFeedback] = useState<Record<number, string>>({});
  const [completionLoading, setCompletionLoading] = useState(false);
  const [nextModuleId, setNextModuleId] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!courseId || !moduleId) return;
      setLoading(true);
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        setModuleItem(data.module || null);
        setSkillLevel(data.skill_level || null);
        if (data.module && typeof data.module.progress_pct === "number") {
          setProgressPct(data.module.progress_pct);
        }
      }
      setLoading(false);
    };
    load();
  }, [courseId, moduleId]);

  const practiceQuestions = useMemo<PracticeQuestion[]>(() => {
    if (!moduleItem || moduleItem.locked) return [];
    const raw = moduleItem.practice_questions;
    if (Array.isArray(raw)) {
      return raw.map((item: any, idx: number) => ({
        id: item.id || String(idx),
        question: item.question || item.prompt || "",
        options: Array.isArray(item.options) ? item.options : [],
        correct: item.correct || item.answer || undefined,
        explanation: item.explanation || undefined,
      }));
    }
    if (moduleItem.concept) {
      return [
        {
          id: "fallback-1",
          question: `Which option best describes ${moduleItem.concept}?`,
          options: [moduleItem.concept, "Unrelated concept", "Only a UI feature", "A database index"],
          correct: moduleItem.concept,
          explanation: "The concept itself is the best match here.",
        },
      ];
    }
    return [];
  }, [moduleItem]);

  const resolveCorrect = (index: number): string | undefined => {
    if (!moduleItem) return undefined;
    const direct = practiceQuestions[index]?.correct;
    if (direct) return direct;
    const answers = moduleItem.practice_answers;
    if (Array.isArray(answers)) return answers[index];
    if (answers && typeof answers === "object") return answers[String(index)];
    return undefined;
  };

  const resolveExplanation = (index: number): string | undefined => {
    const direct = practiceQuestions[index]?.explanation;
    if (direct) return direct;
    return "Review the concept and compare it with the correct option.";
  };

  const handlePracticeCheck = (index: number) => {
    const selected = practiceAnswer[index];
    const correct = resolveCorrect(index);
    if (!selected) return;
    if (correct && selected.trim().toLowerCase() === String(correct).trim().toLowerCase()) {
      setPracticeFeedback((prev) => ({ ...prev, [index]: "Correct!" }));
    } else {
      setPracticeFeedback((prev) => ({ ...prev, [index]: `Not quite. ${resolveExplanation(index)}` }));
    }
  };

  const markComplete = async () => {
    if (!courseId || !moduleId) return;
    setCompletionLoading(true);
    const res = await fetch(
      `/api/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/complete`,
      { method: "POST" }
    );
    if (res.ok) {
      const data = await res.json();
      setNextModuleId(data.next_module_id || null);
      setProgressPct(typeof data.progress_pct === "number" ? data.progress_pct : null);
    }
    setCompletionLoading(false);
  };

  const objectives = useMemo(() => {
    if (!moduleItem?.learning_objectives) return [];
    return moduleItem.learning_objectives
      .split("\n")
      .map((item) => item.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean);
  }, [moduleItem?.learning_objectives]);

  const takeaways = useMemo(() => {
    if (!moduleItem?.summary) return [];
    return moduleItem.summary
      .split("\n")
      .map((item) => item.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean);
  }, [moduleItem?.summary]);

  return (
    <AppShell title={course?.title || "Course Module"} subtitle="Structured learning experience.">
      {loading ? <p>Loading module...</p> : null}
      {!loading && !moduleItem ? (
        <div className="lesson-card">
          <h3>Module not found.</h3>
          <button className="module-open" onClick={() => router.push(`/course/${encodeURIComponent(courseId)}`)}>
            Back to Course
          </button>
        </div>
      ) : null}
      {!loading && moduleItem ? (
        <div className="module-shell">
          <div className="module-header-card" id="module-header">
            <div>
              <h2>
                Module {moduleItem.module_number}: {moduleItem.title}
              </h2>
              <p className="concept">{moduleItem.concept}</p>
            </div>
            <div className="module-meta">
              <span className={`level-pill ${moduleItem.level_type}`}>{moduleItem.level_type}</span>
              <span className="module-meta-pill">{moduleItem.estimated_time || 20} min</span>
              <span className="module-meta-pill">Level: {skillLevel || "Unassigned"}</span>
              {progressPct !== null ? <span className="module-meta-pill">Progress: {progressPct}%</span> : null}
            </div>
            {objectives.length ? (
              <div className="module-objectives">
                <h4>Learning Objectives</h4>
                <ul>
                  {objectives.map((obj) => (
                    <li key={obj}>{obj}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {moduleItem.locked ? (
            <p className="locked-text">This module is locked. Complete the skill quiz to unlock it.</p>
          ) : (
            <>
              <nav className="module-nav">
                <a href="#intro">Introduction</a>
                <a href="#core">Core Explanation</a>
                <a href="#examples">Examples</a>
                <a href="#practice">Mini Practice</a>
                <a href="#takeaways">Key Takeaways</a>
                {moduleItem.advanced_content ? <a href="#advanced">Advanced</a> : null}
              </nav>

              <section className="module-section" id="intro">
                <details open className="module-collapsible">
                  <summary>Concept Introduction</summary>
                  <p>{moduleItem.introduction || moduleItem.explanation}</p>
                </details>
              </section>

              <section className="module-section" id="core">
                <details open className="module-collapsible">
                  <summary>Core Explanation</summary>
                  <div className="module-rich">
                    <p>{moduleItem.explanation}</p>
                  </div>
                </details>
              </section>

              <section className="module-section" id="examples">
                <details className="module-collapsible">
                  <summary>Examples</summary>
                  <div className="module-rich">
                    <p>{moduleItem.examples || "Example content will appear here."}</p>
                  </div>
                </details>
              </section>

              <section className="module-section" id="practice">
                <details className="module-collapsible" open>
                  <summary>Mini Practice</summary>
                  <div className="practice-grid">
                    {practiceQuestions.length ? (
                      practiceQuestions.map((question, index) => (
                        <div className="practice-card" key={question.id || index}>
                          <h4>{question.question}</h4>
                          <div className="practice-options">
                            {question.options.map((opt) => (
                              <label key={opt} className="practice-option">
                                <input
                                  type="radio"
                                  name={`practice-${index}`}
                                  value={opt}
                                  checked={practiceAnswer[index] === opt}
                                  onChange={() =>
                                    setPracticeAnswer((prev) => ({
                                      ...prev,
                                      [index]: opt,
                                    }))
                                  }
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                          <div className="practice-actions">
                            <button className="module-open" onClick={() => handlePracticeCheck(index)}>
                              Check Answer
                            </button>
                            {practiceFeedback[index] ? <p className="practice-feedback">{practiceFeedback[index]}</p> : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="practice-card">
                        <p>No practice questions available yet.</p>
                      </div>
                    )}
                  </div>
                </details>
              </section>

              <section className="module-section" id="takeaways">
                <details className="module-collapsible" open>
                  <summary>Key Takeaways</summary>
                  <div className="module-rich">
                    {takeaways.length ? (
                      <ul className="easy-list">
                        {takeaways.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{moduleItem.summary || "Summaries will appear here."}</p>
                    )}
                  </div>
                </details>
              </section>

              {moduleItem.advanced_content ? (
                <section className="module-section" id="advanced">
                  <details className="module-collapsible">
                    <summary>Advanced Section</summary>
                    <div className="module-rich">
                      <p>{moduleItem.advanced_content}</p>
                    </div>
                  </details>
                </section>
              ) : null}

              <div className="module-complete">
                <button className="module-open" onClick={markComplete} disabled={completionLoading}>
                  {completionLoading ? "Marking..." : "Mark Module Complete"}
                </button>
                {moduleItem.prev_module_id ? (
                  <button
                    className="module-open secondary"
                    onClick={() => router.push(`/course/${encodeURIComponent(courseId)}/module/${moduleItem.prev_module_id}`)}
                  >
                    Previous Module
                  </button>
                ) : null}
                {nextModuleId || moduleItem.next_module_id ? (
                  <button
                    className="module-open secondary"
                    onClick={() =>
                      router.push(
                        `/course/${encodeURIComponent(courseId)}/module/${nextModuleId || moduleItem.next_module_id}`
                      )
                    }
                  >
                    Go to Next Module
                  </button>
                ) : null}
                <button className="module-open" onClick={() => router.push(`/course/${encodeURIComponent(courseId)}`)}>
                  Back to Course
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
