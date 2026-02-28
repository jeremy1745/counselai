# CounselAI

Open-source AI legal assistant. Upload case files, chat with your documents, and get cited answers.

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- ~8 GB RAM (for Ollama models)

### 1. Clone and configure

```bash
git clone <your-repo-url> && cd counselai
cp .env.example .env
```

### 2. Start all services

```bash
docker compose up --build
```

This starts 5 services:

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | React UI |
| Backend | 8000 | FastAPI + Swagger at `/api/docs` |
| PostgreSQL | 5432 | Case/document/chat metadata |
| Qdrant | 6333 | Vector search (dashboard at `:6333/dashboard`) |
| Ollama | 11434 | LLM inference |

### 3. Pull the AI models (first run only)

```bash
docker compose exec ollama ollama pull llama3.1
docker compose exec ollama ollama pull nomic-embed-text
```

### 4. Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 5. Use it

Open [http://localhost:3000](http://localhost:3000):

1. **Create a case** — give it a name and optional description
2. **Upload PDFs** — drag and drop into the upload area
3. **Wait for processing** — status updates from pending → processing → completed
4. **Start a conversation** — click "New Conversation" and ask questions
5. **Get cited answers** — responses include `[Source N]` badges linking to exact document pages

## Development

### Backend (without Docker)

```bash
cd backend
pip install -e .
uvicorn app.main:app --reload
```

### Frontend (without Docker)

```bash
cd frontend
bun install
bun dev
```

Vite proxies `/api` requests to `localhost:8000`.

## Architecture

```
Frontend (React + Vite + Tailwind v4)
    │ nginx proxies /api → backend
    ▼
Backend (FastAPI)
    ├── PostgreSQL (cases, documents, conversations, messages)
    ├── Qdrant (chunk embeddings)
    ├── Ollama (nomic-embed-text + llama3.1)
    └── Background ingestion pipeline
```

### RAG Pipeline

1. User asks a question
2. Question embedded via `nomic-embed-text`
3. Top-10 chunks retrieved from Qdrant (filtered by case)
4. System prompt constructed with numbered sources
5. `llama3.1` streams a response with `[Source N]` citations
6. Citations resolved to document name, page numbers, and text snippet

## License

MIT
