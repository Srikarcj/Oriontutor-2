## YouTube AI Study - Full Stack App

Turn long-form YouTube videos and PDFs into structured learning material, deliver a learning hub experience, and power an AI assistant for document + video Q&A with citations.

---

## Architecture Overview

**High-level components**
- **Frontend (Next.js)**: AI Study Assistant UI, uploads, video analysis, Q&A, streaming answers.
- **Backend (FastAPI)**: ingestion pipelines, RAG orchestration, PDF generation, streaming.
- **Vector Store (FAISS)**: local embeddings + metadata index for PDFs and videos.
- **Data Store (Supabase)**: persistent metadata for documents, embeddings, library items.
- **LLM Provider (Groq)**: summaries, notes, Q&A, flashcards.

**Logical layers**
1. **Ingestion**: YouTube transcript + PDF text extraction.
2. **Chunking**: semantic-ish chunking with overlap.
3. **Embedding**: sentence-transformers vectors.
4. **Indexing**: FAISS for fast similarity search.
5. **RAG**: retrieval + LLM answer (strict for PDFs).
6. **Presentation**: UI with streaming + citations.

---

## Architecture Diagram (Text)

```
Frontend (Next.js)
  ├─ Upload PDF ────────┐
  ├─ Analyze YouTube ───┼──> Backend (FastAPI)
  └─ Ask Question ──────┘        ├─ Transcript/PDF Extract
                                 ├─ Chunk + Embed
                                 ├─ FAISS Index (local)
                                 ├─ Supabase Metadata
                                 └─ Groq LLM (summaries/Q&A)
                                           ↓
                                  Response + Citations + SSE
```

---

## Core Data Flows

### 1) YouTube → Learning Package
1. User submits a YouTube link.
2. Backend fetches transcript, cleans, and chunks.
3. Embeddings are generated and stored in FAISS.
4. Groq generates summary, notes, and flashcards.
5. Response returns `video_id`, summary, notes, flashcards, and PDF URL.

### 2) PDF Upload → Knowledge Base
1. User uploads a PDF.
2. Backend extracts text per page and chunks semantically.
3. Embeddings saved to FAISS and Supabase.
4. PDF becomes searchable for RAG Q&A.

### 3) Ask AI (Unified RAG)
1. Frontend sends question + optional `course_slug` + `video_id`.
2. Backend retrieves top chunks from FAISS (PDF + video).
3. Groq answers with citations.
4. SSE endpoint streams partial answers for fast UX.

---

## API Surface (Key Endpoints)

- `POST /api/video/process`
- `POST /api/qa/ask`
- `POST /api/pdf/upload`
- `POST /api/pdf/ask`
- `GET  /api/knowledge/documents`
- `GET  /api/knowledge/videos`
- `POST /api/knowledge/ask`
- `GET  /api/knowledge/stream` (SSE)

---

## Data Model (Supabase)

**Primary tables**
- `pdf_documents` — document metadata
- `pdf_embeddings` — chunk-level embeddings
- `library_items` — saved items for the user

---

## Environment Variables

Backend (`backend/.env`):
```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
MAX_REQUEST_BYTES=26214400
MAX_UPLOAD_BYTES=26214400
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
```

---

## Performance & Limits

- PDF uploads default to **25 MB**.
- FAISS index stored locally under `backend/vectorstore`.
- PDF strict-answer mode prevents hallucinations when context is missing.

---

## Production Notes

- Run FastAPI behind a reverse proxy (Nginx/Render) with matching request-size limits.
- Persist `backend/vectorstore` and `backend/generated_pdfs` in production storage.
- Supabase stores metadata; FAISS stores vectors for fast retrieval.

### Project layout

- **frontend**: Next.js UI (Vercel-ready) + Clerk auth + study assistant UX
- **backend**: FastAPI service with Groq, FAISS, sentence-transformers, reportlab, PDF ingestion, and knowledge-base APIs

Backend modules:
- `config.py`: environment / path configuration
- `main.py`: FastAPI app, CORS, routes, static files
- `routes/video_routes.py`: video processing endpoint
- `routes/qa_routes.py`: question-answering endpoint
- `routes/assistant_routes.py`: AI assistant endpoint (concepts + file/image Q&A)
- `routes/pdf_routes.py`: PDF upload + PDF Q&A endpoints
- `routes/knowledge_routes.py`: knowledge-base APIs (documents + videos + streaming)
- `services/transcript_service.py`: YouTube transcript fetch + cleaning
- `services/chunk_service.py`: semantic-ish transcript chunking
- `services/embedding_service.py`: local embeddings with `all-MiniLM-L6-v2`
- `services/rag_service.py`: indexing + RAG orchestration
- `services/knowledge_rag_service.py`: unified RAG over PDFs + videos
- `services/pdf_service.py`: PDF generation via reportlab
- `vectorstore/faiss_store.py`: FAISS index + metadata per video
- `llm/groq_client.py`: Groq LLM wrapper for summarization, notes, QA
- `utils/text_cleaning.py`: filler-word / noise removal helpers

---

### Backend - local development

```bash
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Set the Groq API key (in `backend/.env`):

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
MAX_REQUEST_BYTES=26214400
MAX_UPLOAD_BYTES=26214400
```

Run the API (from repo root or backend folder):

```bash
uvicorn backend.main:app --reload --port 8000
```

The FastAPI docs will be at `http://localhost:8000/docs`.

Key endpoints:
- `POST /api/video/process` - body: `{ "youtube_url": "https://..." }`
  - Steps: fetch + clean transcript -> chunk -> embed -> store in FAISS -> generate structured notes with Groq -> render PDF
  - Response: `{ video_id, notes: { title, overview, main_concepts, detailed_explanation, examples, key_takeaways }, pdf_url }`
- `POST /api/qa/ask` - body: `{ "video_id": "<youtube-id>", "question": "..." }`
  - Uses FAISS + Groq to answer from retrieved transcript chunks.
- `POST /api/assistant` - multipart form data:
  - fields: `prompt`
  - files: `uploads` (optional)
  - Uses Groq for clear explanations and file-based Q&A (PDF/text are parsed; images use OCR if available).
- `POST /api/pdf/upload` - multipart form data:
  - fields: `course_slug` (optional)
  - files: `file` (PDF only)
  - Uploads + indexes a PDF for RAG, returns `{ id, name, cached }`.
- `POST /api/pdf/ask` - body: `{ "document_id": "...", "question": "..." }`
  - Context-only answers from that PDF.
- `GET /api/knowledge/documents` - list PDFs (filter by `course_slug` query param).
- `GET /api/knowledge/videos` - list saved videos (filter by `course_slug` query param).
- `POST /api/knowledge/ask` - unified Q&A across PDFs + videos with citations.
- `GET /api/knowledge/stream` - SSE streaming answers for the UI.

Generated PDFs are served from `/static/...` and saved under `backend/generated_pdfs`.

Optional (for image OCR):
- Install Tesseract OCR and ensure `tesseract.exe` is on PATH.

---

### Backend - Docker & Render deployment

Build and run locally:

```bash
cd backend
docker build -t youtube-ai-study-backend .
docker run -p 8000:8000 -e GROQ_API_KEY="your_groq_api_key" youtube-ai-study-backend
```

Render deployment (high level):
- Create a new **Web Service** from your Git repo, pointing to the `backend` directory.
- Set:
  - **Build Command**: `pip install -r backend/requirements.txt`
  - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port 8000`
- Add environment variable: `GROQ_API_KEY`
- Expose port `8000` (Render detects from the start command).

---

### Frontend - local development

```bash
cd frontend
npm install
npm run dev
```

The app will default to calling the backend at `http://localhost:8000`. To point at a hosted backend (e.g. Render), set:

```bash
NEXT_PUBLIC_API_BASE_URL="https://your-backend.onrender.com"
```

You can set this in a `.env.local` file in the `frontend` folder:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com
```

Main UX:
- AI Study Assistant (documents + videos)
- Upload PDFs, build a personal knowledge base, ask questions with citations
- Analyze YouTube lectures (summary, notes, flashcards) and ask video-specific questions
- Course-aware filtering across documents and videos

---

### Frontend - Vercel deployment

1. Push this project to GitHub.
2. In Vercel:
   - Import the repo.
   - Set the project root to `frontend`.
   - Set build command: `npm run build` (default for Next.js).
   - Set output directory: `.next` (default).
3. Environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` - the public URL of your backend (e.g. Render service URL).

After deployment, the Vercel app will call the FastAPI backend for processing and QA.

---

### Notes on production readiness

- **Environment variables**: Groq key is never hard-coded; use `GROQ_API_KEY` in all environments.
- **Local embeddings**: sentence-transformers model is loaded once and cached for performance.
- **Vector store**: FAISS index and metadata are persisted per video under `backend/vectorstore`.
- **PDFs**: reportlab-based generator produces compact, readable study notes PDFs.
- **PDF RAG**: context-only answers (no external hallucinations) for uploaded documents.
- **Unified RAG**: PDFs + videos with citations, plus streaming answers for a fast UI.
