@echo off
REM Quick start script for Reading List Docker deployment (Windows)

echo Starting Reading List Application...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker is not installed. Please install Docker first.
    exit /b 1
)

REM Check if data directory exists
if not exist "data" (
    echo Creating data directory...
    mkdir data
)

REM Build and start containers
echo Building and starting containers...
docker-compose up -d --build

REM Wait a moment
timeout /t 5 /nobreak >nul

REM Check container status
echo.
echo Container Status:
docker-compose ps

echo.
echo Application should be running!
echo Frontend: http://localhost
echo Backend API: http://localhost/api
echo.
echo View logs: docker-compose logs -f
echo Stop: docker-compose down
