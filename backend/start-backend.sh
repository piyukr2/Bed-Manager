#!/bin/bash

# Kill any process using port 5000
echo "🔍 Checking for processes on port 5000..."
lsof -ti:5000 | xargs kill -9 2>/dev/null && echo "✅ Killed existing backend process" || echo "✓ Port 5000 is free"

# Wait a moment for port to be released
sleep 1

# Start the backend server
echo "🚀 Starting backend server on port 5000..."
node src/server.js
