import { formatAnswerBullets, highlightKeywords, makeBullets } from "../lib/client/formatting";

function Highlighted({ text }: { text: string }) {
  const parts = highlightKeywords(text);
  return (
    <>
      {parts.map((part, idx) =>
        part.bold ? <strong key={idx}>{part.value}</strong> : <span key={idx}>{part.value}</span>
      )}
    </>
  );
}

export function AnswerOutput({ answer }: { answer: string }) {
  const bullets = formatAnswerBullets(answer);
  const intro = makeBullets(answer, 1)[0];
  if (!bullets.length) return null;
  return (
    <div className="answer-formatted">
      {intro ? (
        <p className="answer-intro">
          <Highlighted text={intro} />
        </p>
      ) : null}
      <ul>
        {bullets.map((item, idx) => (
          <li key={`${item}-${idx}`}>
            <Highlighted text={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
