import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { AppShell } from "../../../../components/layout/app-shell";

type QuizQuestion = {
  id?: string;
  question_type: string;
  prompt: string;
  options?: string[];
  answer: string;
};

export default function ExamPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : "";
  const dayValue = typeof router.query.day === "string" ? Number(router.query.day) : 1;
  const [courseTitle, setCourseTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/courses/${slug}`)
      .then((res) => res.json())
      .then((data) => setCourseTitle(data.title || "Course"))
      .catch(() => setCourseTitle("Course"));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/lessons/quiz?course_slug=${slug}&day=${dayValue}`)
      .then((res) => res.json())
      .then((data) => setQuestions(data.items || []))
      .catch(() => setQuestions([]));
  }, [slug, dayValue]);

  useEffect(() => {
    setTimeLeft(12 * 60);
  }, [dayValue]);

  useEffect(() => {
    if (!timeLeft || score !== null) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, score]);

  useEffect(() => {
    async function checkLock() {
      if (!slug) return;
      const res = await fetch("/api/progress/get");
      const data = await res.json();
      const entry = (data.items || []).find((item: any) => item.course_slug === slug);
      const unlockedDay = entry?.passed_days?.length ? Math.max(...entry.passed_days) + 1 : 1;
      setLocked(dayValue > unlockedDay);
    }
    checkLock().catch(() => setLocked(false));
  }, [slug, dayValue]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  async function submitExam() {
    const total = questions.length || 1;
    let hits = 0;

    const graded = await Promise.all(
      questions.map(async (question, idx) => {
        const key = question.id || `${idx}`;
        const selected = answers[key] || "";
        if (question.options && question.options.length) {
          return selected.toLowerCase() === question.answer.toLowerCase() ? 1 : 0;
        }
        const res = await fetch("/api/lessons/quiz/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: question.prompt,
            expected: question.answer,
            answer: selected,
          }),
        });
        if (!res.ok) return 0;
        const data = await res.json();
        return data.score >= 50 ? 1 : 0;
      })
    );

    graded.forEach((g) => {
      hits += g;
    });
    const scoreValue = Math.round((hits / total) * 100);
    setScore(scoreValue);

    await fetch("/api/progress/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_slug: slug,
        day: dayValue,
        score: scoreValue,
        passed: scoreValue >= 50,
      }),
    }).catch(() => null);

    await fetch("/api/lessons/quiz/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_slug: slug,
        day: dayValue,
        score: scoreValue,
        total,
        passed: scoreValue >= 50,
        answers,
      }),
    }).catch(() => null);
  }

  const title = courseTitle ? `${courseTitle} - Day ${dayValue} Test` : `Day ${dayValue} Test`;

  return (
    <AppShell title={title} subtitle="Real-time concept exam">
      <section className="exam-page">
        <div className="exam-header">
          <div>
            <h2>Concept Test</h2>
            <p>Score 50% or more to unlock the next lecture.</p>
          </div>
          <div className="exam-timer">
            <strong>Time Left</strong>
            <span>{minutes}:{seconds.toString().padStart(2, "0")}</span>
          </div>
        </div>

        <div className="exam-questions">
          {questions.map((question, index) => {
            const key = question.id || `${index}`;
            return (
              <div key={key} className="exam-card">
                <strong>Q{index + 1}. {question.prompt}</strong>
                {question.options && question.options.length ? (
                  <div className="quiz-options">
                    {question.options.map((option) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name={key}
                          value={option}
                          onChange={(event) =>
                            setAnswers((prev) => ({ ...prev, [key]: event.target.value }))
                          }
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="quiz-text"
                    placeholder="Type your answer"
                    value={answers[key] || ""}
                    onChange={(event) => setAnswers((prev) => ({ ...prev, [key]: event.target.value }))}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="exam-actions">
          <button className="cta-primary" onClick={submitExam} disabled={score !== null || locked}>
            Submit Exam
          </button>
          <Link href={`/learning/${slug}`} className="cta-secondary">Back to Course</Link>
        </div>

        {locked ? (
          <div className="exam-result">
            <strong>Locked</strong>
            <span>Clear the previous day test before attempting this exam.</span>
          </div>
        ) : null}

        {score !== null && !locked ? (
          <div className="exam-result">
            <strong>Your Score: {score}%</strong>
            <span>{score >= 50 ? "Passed. Next lecture unlocked." : "Below 50%. Retake required."}</span>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
