import { useMemo, useState } from "react";

export type QuizQuestion = {
  id: string;
  question: string;
  options?: string[];
  explanation?: string;
};

export type QuizPayload = {
  title?: string;
  questions: QuizQuestion[];
};

export default function QuizComponent({
  quiz,
  onSubmit,
  result,
}: {
  quiz: QuizPayload;
  onSubmit: (answers: Record<string, string>) => void;
  result?: any;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = quiz.questions.length || 0;
  const current = quiz.questions[currentIndex];
  const progress = useMemo(() => {
    if (!total) return 0;
    return Math.round(((currentIndex + 1) / total) * 100);
  }, [currentIndex, total]);

  const next = () => setCurrentIndex((idx) => Math.min(idx + 1, total - 1));
  const prev = () => setCurrentIndex((idx) => Math.max(idx - 1, 0));

  return (
    <div className="quiz-card">
      <div className="quiz-header">
        <h3>{quiz.title || "Assessment"}</h3>
        <span className="quiz-progress-text">
          {currentIndex + 1}/{total}
        </span>
      </div>
      <div className="quiz-progress">
        <div className="quiz-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      {current ? (
        <div className="quiz-question quiz-step">
          <p>{current.question}</p>
          <div className="quiz-options">
            {current.options?.length ? (
              current.options.map((opt) => (
                <label key={opt} className="quiz-option">
                  <input
                    type="radio"
                    name={current.id}
                    value={opt}
                    checked={answers[current.id] === opt}
                    onChange={() => setAnswers((prev) => ({ ...prev, [current.id]: opt }))}
                  />
                  <span>{opt}</span>
                </label>
              ))
            ) : (
              <input
                className="quiz-input"
                value={answers[current.id] || ""}
                onChange={(event) => setAnswers((prev) => ({ ...prev, [current.id]: event.target.value }))}
                placeholder="Type your answer"
              />
            )}
          </div>
        </div>
      ) : null}
      <div className="quiz-actions">
        <button className="quiz-nav" onClick={prev} disabled={currentIndex === 0}>
          Previous
        </button>
        {currentIndex < total - 1 ? (
          <button className="quiz-nav" onClick={next}>
            Next
          </button>
        ) : (
          <button className="quiz-submit" onClick={() => onSubmit(answers)}>
            Submit Quiz
          </button>
        )}
      </div>
      {result ? (
        <div className="quiz-inline-result">
          <strong>Score:</strong> {Math.round(result.score || 0)}% · <strong>Level:</strong> {result.skill_level}
        </div>
      ) : null}
    </div>
  );
}
