# BedManager - Server Start/Stop Guide

This guide explains how to easily start and stop the BedManager application servers without port conflicts.

## 🚀 Quick Start

### Option 1: Start Both Servers at Once (Recommended)

```bash
cd /home/piyush/Downloads/BedManager-11Nov
./start-all.sh
```

This will:
- Automatically kill any processes using ports 3000 and 5000
- Start the backend server on port 5000
- Start the frontend server on port 3000

### Option 2: Start Servers Individually

**Start Backend Only:**
```bash
cd /home/piyush/Downloads/BedManager-11Nov/backend
./start-backend.sh
```

**Start Frontend Only:**
```bash
cd /home/piyush/Downloads/BedManager-11Nov/frontend
./start-frontend.sh
```

## 🛑 Stop Servers

### Stop All Servers:
```bash
cd /home/piyush/Downloads/BedManager-11Nov
./stop-all.sh
```

### Stop Specific Port:
```bash
# Stop backend (port 5000)
lsof -ti:5000 | xargs kill -9

# Stop frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

## 📝 Manual Commands (Alternative)

If you prefer to run manually without scripts:

**Backend:**
```bash
cd /home/piyush/Downloads/BedManager-11Nov/backend
lsof -ti:5000 | xargs kill -9 2>/dev/null
node src/server.js
```

**Frontend:**
```bash
cd /home/piyush/Downloads/BedManager-11Nov/frontend
lsof -ti:3000 | xargs kill -9 2>/dev/null
npm start
```

## 🔍 Check What's Running

To see what's running on each port:

```bash
# Check port 5000 (backend)
lsof -i:5000

# Check port 3000 (frontend)
lsof -i:3000

# Check all Node processes
ps aux | grep node
```

## 🌐 Access the Application

Once both servers are running:

- **Frontend (User Interface):** http://localhost:3000
- **Backend (API):** http://localhost:5000

## ⚠️ Troubleshooting

### Port still busy after running stop script?

Run this to forcefully kill all Node processes:
```bash
killall -9 node
```

### Permission denied when running scripts?

Make scripts executable:
```bash
chmod +x start-all.sh stop-all.sh
chmod +x backend/start-backend.sh
chmod +x frontend/start-frontend.sh
```

### Backend crashes on startup?

Make sure MongoDB is running and accessible at the configured URL.

### Frontend shows connection error?

Ensure the backend is fully started (wait 3-5 seconds) before frontend makes API calls.

## 📌 Tips

1. **Always stop servers before starting again** to avoid port conflicts
2. **Use `start-all.sh` for convenience** - it handles everything automatically
3. **Press Ctrl+C in terminal** to stop servers gracefully when running manually
4. **Check the console output** for any error messages during startup
