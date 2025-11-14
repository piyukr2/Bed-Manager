#!/bin/bash

echo "════════════════════════════════════════"
echo "  BedManager - Stopping All Services"
echo "════════════════════════════════════════"
echo ""

# Kill backend (port 5000)
echo "🛑 Stopping Backend Server (Port 5000)..."
lsof -ti:5000 | xargs kill -9 2>/dev/null && echo "  ✅ Backend stopped" || echo "  ℹ Backend not running"

# Kill frontend (port 3000)
echo "🛑 Stopping Frontend Server (Port 3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "  ✅ Frontend stopped" || echo "  ℹ Frontend not running"

echo ""
echo "════════════════════════════════════════"
echo "  ✅ All Services Stopped!"
echo "════════════════════════════════════════"
