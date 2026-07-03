# Fintrack Agents

## Worker

The worker processes bank notification emails from a BullMQ queue.

**Pipeline:**
1. Parse email text with regex (merchant, amount, date, card type)
2. Look up raw merchant name in MerchantAlias table
3. If found → use cached name + category (no LLM call)
4. If not found → call DeepSeek to categorize → persist to Merchant + MerchantAlias tables
5. Save transaction to Postgres with merchantId FK
6. Apply Gmail label to mark as processed

## Ingester

Polls the Gmail API via OAuth 2.0, finds unlabeled transaction emails, parses them with mailparser, and pushes structured jobs to BullMQ.

## Dashboard

Next.js App Router with shadcn/ui components. Reads from Postgres via API routes. No LLM calls — purely read-only queries.
