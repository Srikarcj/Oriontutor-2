from typing import List, Dict
import re

from groq import Groq

from backend.config import get_settings


class GroqClient:
    """
    Thin wrapper around Groq's Python client for common generation tasks.
    """

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")
        # Keep calls bounded so API routes fail fast with actionable errors.
        self.client = Groq(api_key=settings.groq_api_key, timeout=10, max_retries=1)
        self.model = settings.groq_model

    def _chat(self, messages: List[Dict], temperature: float = 0.3, max_tokens: int | None = None) -> str:
        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except Exception as exc:
            raise RuntimeError(f"Groq request failed: {exc}") from exc
        return completion.choices[0].message.content or ""

    @staticmethod
    def _compress_transcript(text: str, max_chars: int) -> str:
        """
        Reduce transcript size while preserving coverage (start/middle/end) so
        prompts stay under provider token limits on free/low tiers.
        """
        normalized = re.sub(r"\s+", " ", (text or "").strip())
        if len(normalized) <= max_chars:
            return normalized

        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", normalized) if s.strip()]
        if not sentences:
            return normalized[:max_chars]

        # Keep early context, then sample across the body, then keep the tail.
        head_count = min(10, len(sentences))
        tail_count = min(10, max(0, len(sentences) - head_count))

        selected: List[str] = []
        selected.extend(sentences[:head_count])

        body_start = head_count
        body_end = len(sentences) - tail_count
        body = sentences[body_start:body_end] if body_end > body_start else []
        if body:
            stride = max(1, len(body) // 30)
            selected.extend(body[::stride][:30])

        if tail_count:
            selected.extend(sentences[-tail_count:])

        compact = " ".join(selected)
        if len(compact) <= max_chars:
            return compact
        return compact[:max_chars]

    def summarise_video(self, transcript_text: str) -> str:
        compact = self._compress_transcript(transcript_text, max_chars=9000)
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert educator. Summarize the transcript into 6-10 concise bullet points. "
                    "Keep wording factual and tight. Highlight key concepts and definitions."
                ),
            },
            {
                "role": "user",
                "content": compact,
            },
        ]
        return self._chat(messages, temperature=0.2, max_tokens=450)
    def generate_structured_notes(self, transcript_text: str) -> Dict:
        """
        Ask the model to produce a JSON-like structured set of learning notes.
        We parse only shallowly and keep robustness against minor deviations.
        """
        def _build_messages(compact_transcript: str) -> List[Dict]:
            return [
                {
                    "role": "system",
                    "content": (
                        "You are an expert study-note generator and editorial designer. Compose a set of notes that would befit a premium academic publication: "
                        "include clear section headings, bullet lists where useful, and use crisp, engaging language.\n"
                        "Use ONLY the provided transcript. Do not add external facts, examples, tools, or claims.\n"
                        "If a point is unclear in transcript, omit it.\n"
                        "Return STRICT JSON only (no markdown, no code fences) with exact keys:\n"
                        "title (string), overview (string), main_concepts (string[]), "
                        "detailed_explanation (object where each key is a topic and each value is {description: string, resources: string[]}), "
                        "examples (string[]), key_takeaways (string[]).\n"
                        "Keep wording factual and concise. Prioritize major points repeated or emphasized in transcript."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Transcript:\n{compact_transcript}",
                },
            ]

        # Progressive fallback for strict TPM limits (e.g. 6k token tier).
        budgets = [(16000, 1400), (11000, 1100), (8000, 900)]
        last_exc: Exception | None = None
        raw = ""
        for max_chars, max_completion_tokens in budgets:
            compact = self._compress_transcript(transcript_text, max_chars=max_chars)
            try:
                raw = self._chat(_build_messages(compact), temperature=0.1, max_tokens=max_completion_tokens)
                break
            except Exception as exc:
                last_exc = exc
                msg = str(exc).lower()
                if (
                    "request too large" in msg
                    or "rate_limit_exceeded" in msg
                    or "tokens per minute" in msg
                    or "tpm" in msg
                ):
                    continue
                raise

        if not raw:
            raise last_exc if last_exc else RuntimeError("LLM notes generation failed.")

        # Best-effort JSON parsing with fallback to minimal structure
        import json

        def _extract_json_payload(text: str) -> str:
            """
            Extract JSON from common LLM wrappers such as markdown code fences.
            """
            cleaned = text.strip()
            # Remove fenced block markers if present.
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r"\s*```$", "", cleaned)
            # If there is extra prose around JSON, keep only the outermost object.
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                cleaned = cleaned[start : end + 1]
            return cleaned

        try:
            data = json.loads(_extract_json_payload(raw))
        except json.JSONDecodeError:
            # If the model did not strictly follow JSON instructions, fall back.
            data = {
                "title": "Study Notes",
                "overview": raw[:800],
                "main_concepts": [],
                "detailed_explanation": raw,
                "examples": [],
                "key_takeaways": [],
            }

        # Normalise shape
        main_concepts = data.get("main_concepts", [])
        examples = data.get("examples", [])
        key_takeaways = data.get("key_takeaways", [])
        detailed = data.get("detailed_explanation", "")

        if isinstance(main_concepts, str):
            main_concepts = [main_concepts]
        if isinstance(examples, str):
            examples = [examples]
        if isinstance(key_takeaways, str):
            key_takeaways = [key_takeaways]
        if isinstance(detailed, (dict, list)):
            detailed = json.dumps(detailed, ensure_ascii=False, indent=2)

        return {
            "title": data.get("title", "Study Notes"),
            "overview": data.get("overview", ""),
            "main_concepts": main_concepts if isinstance(main_concepts, list) else [],
            "detailed_explanation": detailed if isinstance(detailed, str) else "",
            "examples": examples if isinstance(examples, list) else [],
            "key_takeaways": key_takeaways if isinstance(key_takeaways, list) else [],
        }

    def generate_mindmap(self, notes: Dict, summary: str, transcript_text: str | None = None) -> Dict:
        compact = ""
        if transcript_text:
            compact = self._compress_transcript(transcript_text, max_chars=4000)
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert instructional designer. Build a structured mind map hierarchy from the notes, summary, "
                    "and transcript context. Return STRICT JSON only with keys:\n"
                    "main_topic (string), concepts (array of objects).\n"
                    "Each concept object: name (string), explanation (string), timestamps (string[]), children (array of concept objects).\n"
                    "Keep 4-7 top-level concepts, each with 1-4 children. Include short explanations and any timestamps you can infer."
                ),
            },
            {
                "role": "user",
                "content": f"Summary:\n{summary}\n\nNotes:\n{notes}\n\nTranscript:\n{compact}",
            },
        ]
        raw = self._chat(messages, temperature=0.1, max_tokens=650)
        import json
        try:
            return json.loads(raw)
        except Exception:
            return {"main_topic": notes.get("title", "Mind Map"), "concepts": []}

    def generate_flashcards(self, notes: Dict, summary: str, transcript_text: str | None = None) -> List[Dict]:
        compact = ""
        if transcript_text:
            compact = self._compress_transcript(transcript_text, max_chars=4000)
        messages = [
            {
                "role": "system",
                "content": (
                    "Create 10-16 flashcards from the notes, summary, and transcript. "
                    "Return STRICT JSON only: an array of {question, answer, category, difficulty, bullets}. "
                    "category should be one of: key_concept, definition, explanation. "
                    "difficulty should be one of: easy, medium, hard. "
                    "bullets is an array of 2-4 short bullet points. "
                    "Keep answers concise and accurate."
                ),
            },
            {
                "role": "user",
                "content": f"Summary:\n{summary}\n\nNotes:\n{notes}\n\nTranscript:\n{compact}",
            },
        ]
        raw = self._chat(messages, temperature=0.1, max_tokens=800)
        import json
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return data
        except Exception:
            return []
        return []

    def summarize_context_at_time(self, question: str, context: str, timestamp_label: str) -> str:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a precise tutor. Summarize what happens at the given timestamp based on the context. "
                    "Output 3-5 bullet points, highlight key ideas, and keep it concise."
                ),
            },
            {
                "role": "user",
                "content": f"Question: {question}\nTimestamp: {timestamp_label}\nContext:\n{context}",
            },
        ]
        return self._chat(messages, temperature=0.1, max_tokens=220)

    def answer_question(self, question: str, context_chunks: List[Dict]) -> str:
        """
        Use retrieved transcript chunks as context to answer a user question.
        """
        joined_context = "\n\n".join(
            f"[Segment {c.get('id', i)}] {c.get('text', '')}" for i, c in enumerate(context_chunks)
        )
        messages = [
            {
                "role": "system",
                "content": (
                "You are an expert tutor. Use the transcript context when it is relevant. "
                "If the transcript does not include the answer, provide a concise, high-confidence response using general knowledge. "
                "Never say you are unsure or that you cannot answer. "
                "Keep the answer clear and direct, and use bullet points when it improves clarity."
                ),
            },
            {
                "role": "system",
                "content": f"Transcript context:\n{joined_context}",
            },
            {"role": "user", "content": question},
        ]
        return self._chat(messages, temperature=0.1, max_tokens=350)

    def answer_question_strict(self, question: str, context_chunks: List[Dict]) -> str:
        """
        Answer using ONLY the provided context. Do not use general knowledge.
        """
        joined_context = "\n\n".join(
            f"[Segment {c.get('id', i)}] {c.get('text', '')}" for i, c in enumerate(context_chunks)
        )
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a precise study assistant. Use ONLY the provided context to answer. "
                    "Do not use outside knowledge or assumptions. "
                    "If the answer is not explicitly in the context, say: "
                    "\"I couldn't find that in the uploaded material. Please point me to the page or rephrase.\" "
                    "If the question is about an acronym and the context does not define it, ask for clarification."
                ),
            },
            {
                "role": "system",
                "content": f"Context:\n{joined_context}",
            },
            {"role": "user", "content": question},
        ]
        return self._chat(messages, temperature=0.1, max_tokens=350)

    def answer_general_question(self, question: str) -> str:
        messages = [
            {
                "role": "system",
                "content": (
                "You are an expert tutor. Provide a concise, accurate answer using general knowledge. "
                "Never say you are unsure or that you cannot answer. "
                "Keep it clear, avoid fluff, and use bullet points if helpful."
                ),
            },
            {"role": "user", "content": question},
        ]
        return self._chat(messages, temperature=0.1, max_tokens=350)

    def rewrite_query(self, question: str, conversation: list[dict] | None = None) -> str:
        history = ""
        if conversation:
            snippets = []
            for item in conversation[-4:]:
                role = item.get("role", "user")
                content = item.get("content", "")
                if content:
                    snippets.append(f"{role}: {content}")
            history = "\n".join(snippets)
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a search query rewriter for a knowledge base. "
                    "Rewrite the user question to be specific and searchable. "
                    "Return a single sentence only."
                ),
            },
            {"role": "user", "content": f"Conversation context:\n{history}\n\nQuestion: {question}"},
        ]
        return self._chat(messages, temperature=0.1, max_tokens=80)

    def generate_lesson_package(self, title: str, summary: str, content: str, keywords: list[str] | None = None) -> dict:
        keywords_text = ", ".join(keywords or [])
        context = "\n".join(
            [f"Title: {title}", f"Summary: {summary}", f"Content: {content}", f"Keywords: {keywords_text}"]
        )
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a master teacher and curriculum designer. "
                    "Create a lesson package with clear explanations, structured steps, and exam-grade questions.\n"
                    "Return STRICT JSON only with keys: notes, quiz.\n"
                    "notes: {title, overview, breakdown (string[]), steps (string[]), key_points (string[]), examples (string[]), summary}.\n"
                    "quiz: array of 5-10 questions. Each question: {question_type, prompt, options, answer, explanation, difficulty}.\n"
                    "question_type must be one of: multiple, reasoning, applied.\n"
                    "options is required for multiple choice (4 options). For reasoning/applied, options can be null.\n"
                    "Keep answers concise and accurate. Avoid external facts beyond the provided context."
                ),
            },
            {"role": "user", "content": context},
        ]
        raw = self._chat(messages, temperature=0.2, max_tokens=1200)

        import json

        def _extract_json_payload(text: str) -> str:
            cleaned = text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r"\s*```$", "", cleaned)
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                cleaned = cleaned[start : end + 1]
            return cleaned

        try:
            data = json.loads(_extract_json_payload(raw))
        except Exception:
            data = {
                "notes": {
                    "title": title,
                    "overview": summary or content[:300],
                    "breakdown": [],
                    "steps": [],
                    "key_points": [],
                    "examples": [],
                    "summary": summary or "",
                },
                "quiz": [],
            }

        notes = data.get("notes", {}) if isinstance(data, dict) else {}
        quiz = data.get("quiz", []) if isinstance(data, dict) else []

        def _norm_list(value):
            if isinstance(value, list):
                return [str(v) for v in value]
            if isinstance(value, str):
                return [value]
            return []

        normalized = {
            "notes": {
                "title": str(notes.get("title", title)),
                "overview": str(notes.get("overview", summary or "")),
                "breakdown": _norm_list(notes.get("breakdown", [])),
                "steps": _norm_list(notes.get("steps", [])),
                "key_points": _norm_list(notes.get("key_points", [])),
                "examples": _norm_list(notes.get("examples", [])),
                "summary": str(notes.get("summary", summary or "")),
            },
            "quiz": quiz if isinstance(quiz, list) else [],
        }
        return normalized

    def grade_free_text_answer(self, question: str, expected: str, answer: str) -> dict:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an exam grader. Compare the student's answer to the expected answer.\n"
                    "Return STRICT JSON only with keys: correct (boolean), score (number 0-100), feedback (string).\n"
                    "Be strict but fair. If the student captures the main idea, score >= 70.\n"
                    "If the student misses key points, score < 50."
                ),
            },
            {
                "role": "user",
                "content": f"Question: {question}\nExpected: {expected}\nStudent: {answer}",
            },
        ]
        raw = self._chat(messages, temperature=0.1, max_tokens=220)
        import json
        try:
            data = json.loads(raw)
            return {
                "correct": bool(data.get("correct", False)),
                "score": float(data.get("score", 0)),
                "feedback": str(data.get("feedback", "")),
            }
        except Exception:
            return {"correct": False, "score": 0, "feedback": "Unable to grade automatically."}


def get_groq_client() -> GroqClient:
    return GroqClient()


