# Fintrack

Automated financial tracking that extracts transaction data from BAC bank notification emails and provides a web dashboard.

## Architecture

- **Next.js** — Web dashboard + API routes
- **Prisma** — PostgreSQL ORM with pgvector
- **BullMQ** — Redis-backed job queue
- **Gmail API** — Email ingestion with OAuth
- **DeepSeek** — LLM for merchant categorization

## Services

| Service | Description |
|---------|-------------|
| Dashboard | Next.js web UI at port 3000 |
| Worker | BullMQ queue processor, parses emails and calls LLM |
| Ingester | Polls Gmail API for new BAC notifications |

## Run Locally

```bash
# Start Postgres + Redis
docker run -d --name fintrack-pg -e POSTGRES_USER=fintrack -e POSTGRES_PASSWORD=fintrack -e POSTGRES_DB=fintrack -p 5432:5432 pgvector/pgvector:pg17
docker run -d --name fintrack-redis -p 16379:6379 redis:7

# Setup
cp .env.example .env
npx prisma db push
npx tsx src/lib/seed.ts

# Start (in separate terminals)
npm run dev        # Dashboard at localhost:3000
npm run worker     # Queue processor
npm run ingester   # Gmail poller
```

## Docker (supervised)

Bundles Postgres, Redis, and all services in one container. Map `/data` for persistence.

```
ghcr.io/rickychan21/fintrack:0.8.1
```

## .env

```
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_SEARCH_QUERY=from:notificacion_pa@pa.bac.net subject:Transaccion -label:fintrack_processed
GMAIL_LABEL_DONE=fintrack_processed
LLM_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=sk-your-key
LLM_MODEL=deepseek-chat
```

## How it works

1. **Ingester** polls Gmail for BAC transaction emails
2. Parses the email body with regex (Comercio, Monto, Fecha, etc.)
3. Pushes to BullMQ queue with dedup by email ID
4. **Worker** picks up the job, normalizes merchant name via local table
5. Asks DeepSeek to categorize the merchant only if not cached
6. Saves to Postgres and labels email as processed
7. **Dashboard** reads from Postgres via API routes
