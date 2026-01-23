@echo off
title Instagram App - Next.js Dev Server
color 0A
echo =========================================
echo   Instagram App - Development Server
echo =========================================
echo.

REM Check if .env.local exists
if not exist .env.local (
    color 0C
    echo [ERROR] .env.local not found!
    echo.
    echo Please run start-ngrok.bat first and configure your environment
    echo.
    pause
    exit /b 1
)

echo [OK] .env.local found
echo.

REM Check critical environment variables
findstr /C:"INSTAGRAM_APP_ID=your_instagram_app_id" .env.local >nul
if %ERRORLEVEL% EQU 0 (
    color 0E
    echo [WARNING] Default placeholders detected in .env.local
    echo Please update the following values:
    echo   - INSTAGRAM_APP_ID
    echo   - INSTAGRAM_APP_SECRET
    echo   - DATABASE_URL
    echo   - JWT_SECRET
    echo   - INSTAGRAM_REDIRECT_URI (with your ngrok URL)
    echo   - NEXT_PUBLIC_APP_URL (with your ngrok URL)
    echo.
    echo Continue anyway? (press any key)
    pause >nul
    color 0A
)

REM Check if node_modules exists
if not exist node_modules (
    echo [INFO] node_modules not found
    echo Installing dependencies...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo [OK] Dependencies installed
echo.
echo =========================================
echo   STARTING NEXT.JS SERVER
echo =========================================
echo.
echo Server Status: Starting...
echo.
echo =========================================
echo   SERVER ADDRESSES
echo =========================================
echo.
echo Local:  http://localhost:3000
echo ngrok:  Check ngrok terminal for public URL
echo Web UI: http://127.0.0.1:4040 (ngrok inspector)
echo.
echo =========================================
echo   READY FOR INSTAGRAM OAUTH TESTING
echo =========================================
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev
