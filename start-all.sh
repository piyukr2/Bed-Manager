#!/bin/bash

echo "════════════════════════════════════════"
echo "  BedManager - Starting All Services"
echo "════════════════════════════════════════"
echo ""

# Kill processes on both ports
echo "🧹 Cleaning up old processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null && echo "  ✅ Killed backend on port 5000" || echo "  ✓ Port 5000 is free"
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "  ✅ Killed frontend on port 3000" || echo "  ✓ Port 3000 is free"

echo ""
echo "⏳ Waiting for ports to be released..."
sleep 2

# Start backend in background
echo ""
echo "🚀 Starting Backend Server (Port 5000)..."
cd backend
node src/server.js &
BACKEND_PID=$!
echo "  ✓ Backend started with PID: $BACKEND_PID"

# Wait for backend to initialize
sleep 3

# Start frontend in background
echo ""
echo "🚀 Starting Frontend Server (Port 3000)..."
cd ../frontend
npm start &
FRONTEND_PID=$!
echo "  ✓ Frontend started with PID: $FRONTEND_PID"

echo ""
echo "════════════════════════════════════════"
echo "  ✅ All Services Started!"
echo "════════════════════════════════════════"
echo ""
echo "  Backend:  http://localhost:5000"
echo "  Frontend: http://localhost:3000"
echo ""
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "════════════════════════════════════════"
echo ""

# Wait for both processes
wait
