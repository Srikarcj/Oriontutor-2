import { useEffect, useMemo, useState } from "react";
import { makeBullets } from "../lib/client/formatting";
import type { Flashcard, Notes } from "../lib/types";

type Card = Flashcard & { id: string };

function buildFlashcards(notes?: Notes | null, summary?: string, transcript?: string): Card[] {
  const cards: Card[] = [];
  const concepts = notes?.main_concepts || [];
  concepts.forEach((concept, idx) => {
    cards.push({
      id: `concept-${idx}`,
      question: `What is ${concept}?`,
      answer: `The video presents ${concept} as a key concept to understand.`,
      category: "key_concept",
      difficulty: "easy",
      bullets: [],
    });
  });

  const takeaways = notes?.key_takeaways || [];
  takeaways.forEach((takeaway, idx) => {
    cards.push({
      id: `takeaway-${idx}`,
      question: "Key takeaway",
      answer: takeaway,
      category: "explanation",
      difficulty: "easy",
      bullets: [],
    });
  });

  const summaryBullets = makeBullets(summary || notes?.overview || "", 6);
  summaryBullets.forEach((point, idx) => {
    cards.push({
      id: `summary-${idx}`,
      question: "Summary insight",
      answer: point,
      category: "definition",
      difficulty: "medium",
      bullets: [],
    });
  });

  if (!cards.length && transcript) {
    const bullets = makeBullets(transcript, 8);
    bullets.forEach((point, idx) => {
      cards.push({
        id: `transcript-${idx}`,
        question: "Concept from transcript",
        answer: point,
        category: "explanation",
        difficulty: "medium",
        bullets: [],
      });
    });
  }

  return cards.slice(0, 18);
}

function normalizeFlashcards(cards: Flashcard[]): Card[] {
  return cards.map((card, idx) => ({
    id: `${card.question}-${idx}`,
    question: card.question,
    answer: card.answer,
    category: card.category || "key_concept",
    difficulty: card.difficulty || "medium",
    bullets: Array.isArray(card.bullets) ? card.bullets : [],
    learned: card.learned,
  }));
}

function shuffleCards(cards: Card[]) {
  const next = [...cards];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function Flashcards({
  notes,
  summary,
  transcript,
  flashcards,
}: {
  notes?: Notes | null;
  summary?: string;
  transcript?: string;
  flashcards?: Flashcard[];
}) {
  const baseCards = useMemo(() => {
    if (flashcards && flashcards.length) return normalizeFlashcards(flashcards);
    return buildFlashcards(notes, summary, transcript);
  }, [notes, summary, transcript, flashcards]);

  const [order, setOrder] = useState<Card[]>(baseCards);
  const [shuffle, setShuffle] = useState(false);
  const [learned, setLearned] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<"standard" | "spaced">("standard");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set(baseCards.map((c) => c.category || "key_concept"));
    return ["all", ...Array.from(set)];
  }, [baseCards]);

  useEffect(() => {
    let next = baseCards;
    if (category !== "all") {
      next = next.filter((c) => c.category === category);
    }
    if (mode === "spaced") {
      const unlearned = next.filter((c) => !learned.has(c.id));
      next = [...unlearned, ...next];
    }
    if (shuffle) next = shuffleCards(next);
    setOrder(next);
    setIndex(0);
    setFlipped(false);
  }, [baseCards, shuffle, mode, category, learned]);

  useEffect(() => {
    const initial = new Set<string>();
    baseCards.forEach((card) => {
      if (card.learned) initial.add(card.id);
    });
    if (initial.size) {
      setLearned(initial);
    }
  }, [baseCards]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        setFlipped(false);
        setIndex((i) => (i + 1) % Math.max(order.length, 1));
      }
      if (event.key === "ArrowLeft") {
        setFlipped(false);
        setIndex((i) => (i - 1 + Math.max(order.length, 1)) % Math.max(order.length, 1));
      }
      if (event.key === " ") {
        event.preventDefault();
        setFlipped((prev) => !prev);
      }
      if (event.key.toLowerCase() === "l") {
        if (order[index]) {
          setLearned((prev) => new Set(prev).add(order[index].id));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [order, index]);

  if (!order.length) {
    return <p className="muted">Flashcards will appear once analysis is complete.</p>;
  }

  const card = order[index];
  const isLearned = learned.has(card.id);
  const completion = order.length ? Math.round((learned.size / order.length) * 100) : 0;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(order, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flashcards.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const html = `
      <html><head><title>Flashcards</title>
      <style>
        body { font-family: Manrope, sans-serif; padding: 24px; }
        h2 { margin: 0 0 12px; }
        .card { border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 12px; border-radius: 10px; }
        .q { font-weight: 700; margin-bottom: 6px; }
        .meta { color: #64748b; font-size: 12px; margin-bottom: 6px; }
        ul { margin: 6px 0 0 18px; }
      </style></head><body>
      <h2>Flashcards</h2>
      ${order
        .map(
          (c) => `
          <div class="card">
            <div class="q">${c.question}</div>
            <div class="meta">${c.category} • ${c.difficulty}</div>
            <div>${c.answer}</div>
            ${c.bullets && c.bullets.length ? `<ul>${c.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
          </div>
        `
        )
        .join("")}
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const exportPrint = () => {
    exportPdf();
  };

  return (
    <div className="flashcards">
      <div className="flashcard-toolbar">
        <div className="flashcard-meta">
          <span>{completion}% complete</span>
          <span>{learned.size} learned / {order.length}</span>
        </div>
        <div className="flashcard-filters">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
            ))}
          </select>
          <button onClick={() => setMode((m) => (m === "standard" ? "spaced" : "standard"))}>
            {mode === "standard" ? "Spaced Repetition" : "Standard Mode"}
          </button>
          <button onClick={() => setShuffle((s) => !s)}>{shuffle ? "Unshuffle" : "Shuffle"}</button>
        </div>
      </div>

      <div
        className={`flashcard ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((prev) => !prev)}
      >
        <div className="flashcard-face flashcard-front">
          <div className="flashcard-tag">{card.category}</div>
          <p>{card.question}</p>
          <span>Click or press Space to flip</span>
        </div>
        <div className="flashcard-face flashcard-back">
          <div className="flashcard-tag">{card.difficulty}</div>
          <p>{card.answer}</p>
          {card.bullets && card.bullets.length ? (
            <ul>
              {card.bullets.map((b, idx) => <li key={`${b}-${idx}`}>{b}</li>)}
            </ul>
          ) : null}
          <span>Press L to mark learned</span>
        </div>
      </div>

      <div className="flashcard-controls">
        <button onClick={() => { setFlipped(false); setIndex((i) => (i - 1 + order.length) % order.length); }}>
          Previous
        </button>
        <span>{index + 1} / {order.length}</span>
        <button onClick={() => { setFlipped(false); setIndex((i) => (i + 1) % order.length); }}>
          Next
        </button>
      </div>

      <div className="flashcard-actions">
        <button
          className={`flashcard-learned ${isLearned ? "active" : ""}`}
          onClick={() => {
            const next = new Set(learned);
            if (isLearned) {
              next.delete(card.id);
            } else {
              next.add(card.id);
            }
            setLearned(next);
          }}
        >
          {isLearned ? "Marked as Learned" : "Mark as Learned"}
        </button>
        <div className="flashcard-export">
          <button onClick={exportPdf}>Export PDF</button>
          <button onClick={exportPrint}>Printable Cards</button>
          <button onClick={exportJson}>Export JSON</button>
        </div>
      </div>
    </div>
  );
}
