@echo off
setlocal

echo Starting Tutor App locally...

:: Check for existing processes
echo Stopping any existing running instances...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /FI "WINDOWTITLE eq npm*" /T 2>nul

echo Checking dependencies...

:: Backend
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate venv
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Error: Could not find virtual environment activation script.
    exit /b 1
)

echo Installing backend dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ..

:: Frontend
cd frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
)
cd ..

:: Start services
echo Starting backend...
cd backend
call venv\Scripts\activate.bat
start /B python src/main.py
cd ..

echo Starting frontend...
cd frontend
start /B npm run dev
cd ..

echo.
echo =========================================
echo Tutor App is running!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo Close this window to stop all servers.
echo =========================================
echo.

:: Keep window open
pause
