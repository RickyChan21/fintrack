#!/bin/bash

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Seeding categories..."
npx tsx src/lib/seed.ts

echo "Starting Gmail Ingester in background..."
npx tsx ingester/index.ts &

echo "Starting Worker in background..."
npx tsx worker/index.ts &

echo "Starting Next.js dashboard on port 3000..."
npx next start --port 3000
