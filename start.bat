@echo off
title Network Engineer Task Tracker
echo.
echo ============================================
echo   Network Engineer Task Tracker
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo   https://nodejs.org/
    echo.
    echo Choose the LTS version and run the installer.
    echo After installing, close this window and run start.bat again.
    echo.
    pause
    exit /b
)

echo [OK] Node.js found:
node -v

:: Install dependencies if needed
if not exist "node_modules" (
    echo.
    echo [SETUP] Installing dependencies...
    npm install
    echo.
)

:: Start the server
echo.
echo [STARTING] Server is starting...
echo.
node server.js
pause
