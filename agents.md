# 🤖 Fintrack AI Agents

This document defines the specialized AI personas and roles utilized within the Fintrack ecosystem. Each agent is designed with specific system prompts and constraints to ensure high-accuracy financial processing.

## 🏗️ Active Agents

### 1. The Extraction Specialist
*Current implementation in `worker.py`*

**Role:** Expert Financial Data Parser
**Primary Goal:** Transform messy, unstructured bank notification snippets (SMS, Emails, Push Notifications) into clean, structured JSON data.

**Capabilities:**
- **Linguistic Context:** Handles Spanish banking notifications specifically from Panamanian institutions.
- **Merchant Normalization:** Strips away gateway prefixes (e.g., `PEDIDOSYA*`, `PAGUELOFA*`) to identify the actual merchant.
- **Categorization:** Maps transactions against a dynamic list of user-defined categories fetched from the database.
- **Confidence Scoring:** Outputs a reliability metric (0.0 - 1.0) to flag uncertain extractions for human review.

**System Persona:**
> "You are an expert financial assistant specialized in Panamanian commerce and Spanish banking notifications. You clean up messy merchant names and extract structured data."

---

## 🔮 Future Agent Roadmap

To further enhance the Fintrack ecosystem, the following agents are planned for development:

### 2. The Vector Librarian
**Role:** Semantic Search & Relationship Mapper
**Objective:** Manage the `embedding` layer of the transaction database.
- Identify clusters of similar transactions that don't share the same merchant name.
- Enhance search queries by understanding intent (e.g., searching for "fast food" returns KFC, McDonalds, and Subway).

### 3. The Fraud Sentinel
**Role:** Anomaly Detection Specialist
**Objective:** Monitor transaction flow for suspicious patterns.
- Flag sudden spikes in spending at specific merchants.
- Identify geographic anomalies (e.g., a physical purchase in Panama followed by one in Europe within 1 hour).
- Detect potential double-billing or subscription "creepers."

### 4. The Wealth Strategist
**Role:** Budgeting & Insight Coach
**Objective:** Provide high-level analysis of financial health.
- Analyze monthly trends and suggest areas for cost-cutting.
- Generate natural language summaries of weekly spending patterns.
- Predicte future cash flow based on historical recurrence.

---

## 🛠️ Performance Monitoring
Agent performance is tracked via the `confidence_score` column in the `transactions` table. 
- **High Confidence (>0.85):** Fully automated.
- **Medium Confidence (0.50 - 0.85):** Flagged in UI for verification.
- **Low Confidence (<0.50):** Automatically sent to the **Dead Letter Queue (DLQ)** for manual correction.
