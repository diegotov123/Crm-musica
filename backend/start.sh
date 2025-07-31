#!/bin/bash

# Railway deployment script for FastAPI backend
echo "🚀 Starting Ventas Music Backend..."

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Start the FastAPI server
echo "🌟 Starting FastAPI server..."
uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}