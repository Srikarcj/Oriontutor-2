## YouTube AI Study - Full Stack App

Turn long-form YouTube videos into structured learning material, deliver a learning hub experience, and power an AI assistant for concept explanations and file-based Q&A.

### Project layout

- **frontend**: Next.js + TailwindCSS UI deployed to Vercel
- **backend**: FastAPI service with Groq, FAISS, sentence-transformers, reportlab, and an AI assistant endpoint

Backend modules:
- `config.py`: environment / path configuration
- `main.py`: FastAPI app, CORS, routes, static files
- `routes/video_routes.py`: video processing endpoint
- `routes/qa_routes.py`: question-answering endpoint
- `routes/assistant_routes.py`: AI assistant endpoint (concepts + file/image Q&A)
- `services/transcript_service.py`: YouTube transcript fetch + cleaning
- `services/chunk_service.py`: semantic-ish transcript chunking
- `services/embedding_service.py`: local embeddings with `all-MiniLM-L6-v2`
- `services/rag_service.py`: indexing + RAG orchestration
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
- Browse and open courses in the Learning Hub
- Click any concept chip to get a clear explanation from the AI assistant
- Upload a PDF/text/image and ask questions based on that content
- Use the original YouTube-to-notes flow for structured study materials

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
- **RAG pipeline**: question -> local embedding -> FAISS search -> Groq answer constrained to retrieved context.
