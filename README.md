# Fintrack

Automated financial tracking that pulls transaction alerts from Gmail, extracts structured data using an LLM, and stores everything in PostgreSQL with a clean web dashboard.

## Features

- **Gmail Ingestion**: Periodically fetches bank transaction emails via IMAP, tagging processed emails to prevent duplicates.
- **LLM Extraction**: Uses an LLM (local or API-based) to parse messy Spanish bank notifications into structured fields (merchant, amount, category, etc.).
- **Queue Processing**: Redis-backed RPOPLPUSH pattern ensures zero message loss. Dead letter queue for persistently failing messages.
- **Duplicate Detection**: Skips transactions matching on merchant, amount, and date.
- **Vector Search**: Generates 384-dimension embeddings for semantic search and similarity matching.
- **Web Dashboard**: FastAPI + Tailwind dashboard with search, filters, category breakdown, spending timeline, and merchant analysis.

## Setup

### Requirements
- Python 3.14+
- Redis (Valkey)
- PostgreSQL with pgvector extension

### Installation
```bash
pip install -r requirements.txt
```

### Configuration
Copy `.env.example` to `.env` and fill in your details:
```bash
cp .env.example .env
```

Key variables:
- `REDIS_HOST`: IP of your Redis server.
- `DATABASE_URL`: Your Postgres connection string (e.g. `postgresql://user:pass@host:5432/fintrack`).
- `LLM_BASE_URL`: API endpoint for your LLM (e.g. `http://192.168.0.XX:11434/v1` for Ollama, or `https://api.deepseek.com/v1`).
- `LLM_MODEL`: Model name (e.g. `llama3`, `deepseek-chat`).
- `GMAIL_USER`: Your Gmail address.
- `GMAIL_APP_PASSWORD`: A 16-character Google App Password.
- `GMAIL_SEARCH_QUERY`: IMAP query to find bank emails.
- `GMAIL_LABEL_DONE`: Gmail label applied after processing (create it in Gmail first).

### Run
```bash
bash start.sh
```

This starts:
- **Gmail Ingester** (background) — polls Gmail for new bank notifications
- **Web Dashboard** (background) — serves the dashboard on port 8000
- **Fintrack Worker** (foreground) — processes the queue

Open `http://localhost:8000` to view the dashboard.

## Docker

The included `Dockerfile` builds a container with all three services. Port 8000 is exposed for the dashboard.

The workflow builds and publishes images to `ghcr.io` on tagged releases (`v*.*.*`).

## Error Handling

- **LLM Retries**: Exponential backoff (1s → 60s) on connection errors.
- **Offline Host**: Worker sleeps 5 minutes if LLM host is unreachable.
- **Dead Letter Queue**: Messages failing twice are moved to `fintrack_queue_dead_letter`.
