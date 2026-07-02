# Fintrack Agents

## Worker

The worker processes BAC bank notification emails from a BullMQ queue.

**Pipeline:**
1. Parse email text with regex (merchant, amount, date, card type)
2. Normalize merchant name via local lookup table (Amazon → Amazon, etc.)
3. Check in-memory cache for existing merchant→category mapping
4. If not cached, call DeepSeek to categorize (single prompt, JSON response)
5. Save transaction to Postgres
6. Apply Gmail label to mark as processed

## Ingester

Polls the Gmail API via OAuth 2.0, finds unlabeled BAC transaction emails, parses them with mailparser, and pushes structured jobs to BullMQ.

## Dashboard

Next.js App Router with shadcn/ui components. Reads from Postgres via API routes. No LLM calls — purely read-only queries.
