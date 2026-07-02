#!/bin/bash

# Start the Gmail Ingester in the background
echo "Starting Gmail Ingester in background..."
python gmail_ingester.py &

# Start Streamlit Dashboard in the background
echo "Starting Streamlit Dashboard on port 8501..."
streamlit run dashboard.py --server.port 8501 --server.address 0.0.0.0 &

# Start the worker in the foreground
echo "Starting Fintrack Worker..."
python worker.py
