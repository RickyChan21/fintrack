#!/bin/bash

echo "Starting Gmail Ingester in background..."
python gmail_ingester.py &

echo "Starting Fintrack Dashboard on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 &

echo "Starting Fintrack Worker..."
python worker.py
