@echo off
title Instagram App - ngrok Tunnel
color 0B
echo =========================================
echo   Instagram App - ngrok Setup
echo =========================================
echo.

REM Check if ngrok is installed
where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] ngrok is not installed!
    echo.
    echo Please install ngrok using one of these methods:
    echo   1. choco install ngrok
    echo   2. winget install ngrok
    echo   3. Download from https://ngrok.com/download
    echo.
    pause
    exit /b 1
)

echo [OK] ngrok is installed and configured
echo [OK] Auth token: Configured
echo.

REM Check if .env.local exists
if not exist .env.local (
    color 0E
    echo [WARNING] .env.local not found
    echo Creating from .env.example...
    copy .env.example .env.local
    echo.
    echo [ACTION REQUIRED] Please edit .env.local with:
    echo   - INSTAGRAM_APP_ID
    echo   - INSTAGRAM_APP_SECRET  
    echo   - DATABASE_URL
    echo   - JWT_SECRET=nb7HPwzh/qcvR2fTMsr/0c//TR232r1+LC6VuvJC64k=
    echo.
    echo Then restart this script
    echo.
    pause
    exit /b 1
)

echo [OK] .env.local found
echo.
echo =========================================
echo   STARTING NGROK TUNNEL
echo =========================================
echo.
echo Port: 3000 (Next.js dev server)
echo Protocol: HTTPS
echo.
echo =========================================
echo   NEXT STEPS:
echo =========================================
echo.
echo 1. COPY the HTTPS URL below (https://xxxxx.ngrok-free.app)
echo.
echo 2. UPDATE .env.local with your ngrok URL:
echo    INSTAGRAM_REDIRECT_URI=https://xxxxx.ngrok-free.app/api/auth/instagram/callback
echo    NEXT_PUBLIC_APP_URL=https://xxxxx.ngrok-free.app
echo.
echo 3. UPDATE Facebook App Settings:
echo    - Go to: https://developers.facebook.com/apps
echo    - Add callback URL to "Valid OAuth Redirect URIs"
echo.
echo 4. RESTART Next.js server (run start-dev.bat)
echo.
echo 5. VIEW requests: http://127.0.0.1:4040
echo.
echo =========================================
echo   NGROK TUNNEL ACTIVE
echo =========================================
echo.

ngrok http 3000 --log=stdout
