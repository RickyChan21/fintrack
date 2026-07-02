# Fintrack AI Worker v2.0

A robust, reliable Python worker designed to automate financial tracking. It actively pulls transaction alerts from Gmail, pushes them to a Redis queue, categorizes them using a local LLM (Ollama, LM Studio, etc.), and stores them in PostgreSQL.

## 🚀 Key Features

-   **Automated Gmail Ingestion**: Periodically fetches new bank transaction emails via IMAP, automatically tagging processed emails to prevent duplicates.
-   **Reliable Queue Implementation**: Uses the RPOPLPUSH pattern to ensure zero message loss even if the worker crashes mid-task.
-   **Local LLM Integration**: Optimized for local models with custom base URLs and formatted JSON extraction.
-   **Network Awareness**: Automatically detects if your local LLM host (desktop) is offline and enters a low-resource "waiting" state with exponential backoff.
-   **Dead Letter Queue (DLQ)**: Automatically moves consistently failing messages to a separate queue (`fintrack_queue_dead_letter`) for manual inspection.
-   **Duplicate Detection**: Smart detection of duplicate transactions based on Merchant, Amount, and Date to prevent double-counting.
-   **Confidence Scoring**: The LLM provides a confidence score for its extraction.
-   **AI Vector Search**: Automatically generates 384-dimension embeddings for every transaction, enabling semantic search and similarity matching.
-   **Rich UI Logging**: Premium terminal feedback with tables, panels, and status indicators.
-   **Dynamic Category Caching**: Fetches valid categories from your DB and caches them in memory, with auto-refresh every 10 minutes.

## 🛠 Setup

### 1. Requirements
-   Python 3.14+
-   Redis (Valkey)
-   PostgreSQL

### 2. Installation
```bash
pip install -r requirements.txt
```

### 3. Configuration
Copy `.env.example` to `.env` and fill in your network details:
```bash
cp .env.example .env
```
Key variables:
- `REDIS_HOST`: IP of your Redis server.
- `DATABASE_URL`: Your full Postgres connection string.
- `LLM_BASE_URL`: The API endpoint of your local LLM (e.g., `http://192.168.0.XX:11434/v1`).
- `LLM_MODEL`: The name of the model to use (e.g., `llama3`).
- `GMAIL_USER`: Your Gmail address.
- `GMAIL_APP_PASSWORD`: A 16-character Google App Password (do not use your real password).
- `GMAIL_SEARCH_QUERY`: The IMAP search string to find your bank emails (e.g., `"from:notificacion_pa@pa.bac.net subject:Transaccion -label:fintrack_processed"`).
- `GMAIL_LABEL_DONE`: The Gmail label to apply after processing (e.g., `fintrack_processed`). **You must create this label in your Gmail account manually.**

### 4. Run the Application
```bash
bash start.sh
```
*(This starts both the background Gmail ingester and the foreground Fintrack AI worker).*

## 📦 Docker Support
The project includes a `Dockerfile` using Python 3.14-slim for production deployment. It automatically uses `start.sh` to run both the email ingester and the LLM worker in a single container.

## 📊 Data Formats

### Redis Input
The worker listens to `fintrack_queue`. Messages should be JSON:
```json
{
  "id": "unique_tx_id_123",
  "snippet": "Purchase at KFC for USD 9.28 on 2026/03/06"
}
```

### Database Schema (Postgres)
The worker writes to the `transactions` table:
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Unique ID from snippet |
| `merchant` | TEXT | Extracted store name |
| `amount` | DECIMAL | Transaction amount |
| `currency` | TEXT | Currency code (default 'USD') |
| `category` | TEXT | Extracted category name |
| `transaction_date` | TIMESTAMP | Extracted date |
| `raw_snippet` | TEXT | Full original text |
| `confidence_score` | FLOAT | LLM confidence rating (0.0 - 1.0) |
| `embedding` | VECTOR(384) | AI semantic search vector |

## 💀 Error Handling
-   **Retry Strategy**: 1s -> 2s -> 4s ... up to 60s for LLM errors.
-   **Offline Desktop**: If the LLM host is unreachable, the worker sleeps for 5 minutes between checks to save resources.
-   **Failing Tasks**: After 2 consecutive failures for a specific message, it is moved to `fintrack_queue_dead_letter`.
