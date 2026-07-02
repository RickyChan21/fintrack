-- Fintrack AI Database Schema
-- Optimized for PostgreSQL with pgvector

-- 1. Enable the vector extension for AI semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Categories Table
-- Stores valid transaction categories for the LLM to choose from
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- 3. Transactions Table
-- Main storage for processed financial data
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,                       -- Unique ID from the notification snippet
    merchant TEXT NOT NULL,                    -- Cleaned up store/business name
    amount NUMERIC(12, 2) NOT NULL,            -- Transaction value
    currency TEXT DEFAULT 'USD',               -- Currency code
    category_id INTEGER REFERENCES categories(id), -- Optional foreign key to categories table
    category TEXT,                             -- The category name string (extracted by AI)
    bank TEXT,                                 -- The bank name (extracted by AI)
    transaction_type TEXT,                     -- e.g., 'Yappy', 'Credit Card', 'ACH'
    transaction_date TIMESTAMP,                -- The date extracted from the snippet
    processed_at TIMESTAMP DEFAULT NOW(),      -- When the worker processed this record
    raw_snippet TEXT,                          -- The original unparsed notification text
    confidence_score DOUBLE PRECISION,         -- LLM's confidence in the extraction (0.0 - 1.0)
    embedding VECTOR(384)                      -- AI semantic search vector
);

-- 4. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- 5. Vector Index (HNSW) for fast semantic search
-- Note: 'vector_l2_ops' is used for Euclidean distance. 
-- You might use 'vector_cosine_ops' if your similarity search uses cosine.
CREATE INDEX IF NOT EXISTS idx_transactions_embedding ON transactions 
USING hnsw (embedding vector_cosine_ops);

-- 6. Initial Seed Data
-- Standard one-word personal finance categories
INSERT INTO categories (name) VALUES 
    ('Groceries'),
    ('Dining'),
    ('Transportation'),
    ('Utilities'),
    ('Subscriptions'),
    ('Shopping'),
    ('Health'),
    ('Entertainment'),
    ('Travel'),
    ('Transfers'),
    ('Income'),
    ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;
