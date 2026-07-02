# Fintrack

Automated financial tracking that extracts structured transaction data from bank notification emails and provides a clean web dashboard.

## Architecture

- **Next.js** — Web dashboard + API routes
- **Prisma** — PostgreSQL ORM with pgvector
- **Redis** — Queue for processing jobs
- **OpenAI-compatible API** — LLM extraction (DeepSeek, Ollama, etc.)

## Services

| Service | Description | Port |
|---------|-------------|------|
| Dashboard | Next.js web UI | 3000 |
| Worker | Redis queue processor with LLM extraction | — |
| Ingester | Gmail IMAP poller | — |

## Setup

### Requirements
- Node.js 22+
- Redis
- PostgreSQL with pgvector extension

### Configuration
Copy `.env.example` to `.env` and fill in:
```bash
cp .env.example .env
```

### Install & Run
```bash
npm install
npx prisma db push
npm run dev          # Dashboard (http://localhost:3000)
npm run worker       # Queue processor
npm run ingester     # Gmail poller
```

### Docker
```bash
docker build -t fintrack .
docker run -p 3000:3000 --env-file .env fintrack
```

## Release

Tag with semver to trigger a Docker image build via GitHub Actions:
```bash
git tag v1.0.0
git push origin v1.0.0
```
