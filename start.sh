#!/bin/bash

echo "Starting Tutor App locally..."

echo "Stopping any existing running instances..."
# Kill any processes already listening on the backend or frontend ports
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Function to clean up background processes on exit
cleanup() {
    echo ""
    echo "Stopping Tutor App..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and EXIT signals to run the cleanup function
trap cleanup SIGINT EXIT

# Start backend server
echo "Starting backend..."
cd backend
# Activate virtual environment if it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
python src/main.py &
BACKEND_PID=$!
cd ..

# Start frontend development server
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================="
echo "Tutor App is running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to gracefully stop all servers."
echo "========================================="
echo ""

# Wait for background processes to finish
wait
