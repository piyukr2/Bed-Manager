#!/bin/bash

# Kill any process using port 3000
echo "🔍 Checking for processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "✅ Killed existing frontend process" || echo "✓ Port 3000 is free"

# Wait a moment for port to be released
sleep 1

# Start the frontend server
echo "🚀 Starting frontend server on port 3000..."
npm start
