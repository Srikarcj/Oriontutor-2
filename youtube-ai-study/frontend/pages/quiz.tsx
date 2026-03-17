import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/layout/app-shell";
import QuizComponent from "../components/quiz-component";

export default function QuizPage() {
  const router = useRouter();
  const quizId = typeof router.query.quiz_id === "string" ? router.query.quiz_id : "";
  const [quiz, setQuiz] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!quizId) return;
    fetch(`/api/quiz?quiz_id=${encodeURIComponent(quizId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setQuiz(data?.quiz || null));
  }, [quizId]);

  const submitQuiz = async (answers: Record<string, string>) => {
    if (!quiz?.id) return;
    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz_id: quiz.id, answers }),
    });
    if (res.ok) {
      const data = await res.json();
      setResult(data.result);
    }
  };

  return (
    <AppShell title="Quiz" subtitle="Take assessments linked to your courses.">
      {!quizId ? <p>Open a quiz from a course to get started.</p> : null}
      {quiz ? (
        <QuizComponent quiz={{ id: quiz.id, title: quiz.title, questions: quiz.questions }} onSubmit={submitQuiz} />
      ) : quizId ? (
        <p>Loading quiz...</p>
      ) : null}
      {result ? (
        <div className="quiz-result">Score: {result.score}/{result.total} ({result.percentage?.toFixed?.(1) || 0}%)</div>
      ) : null}
    </AppShell>
  );
}
