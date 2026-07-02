#!/bin/bash

# Start the Gmail Ingester in the background
echo "Starting Gmail Ingester in background..."
python gmail_ingester.py &

# Start the worker in the foreground
echo "Starting Fintrack Worker..."
python worker.py
