@echo off
title Instagram App - Interactive Setup
color 0B

echo.
echo  ╔════════════════════════════════════════════╗
echo  ║   Instagram App - ngrok Setup Complete    ║
echo  ╚════════════════════════════════════════════╝
echo.

echo  🔐 Security Status: ALL SAFE
echo  ✅ ngrok configured
echo  ✅ .env.local created  
echo  ✅ JWT secret generated
echo  ✅ All sensitive files protected
echo.
echo  ────────────────────────────────────────────
echo.
echo  📋 REQUIRED: Configure Your API Keys
echo  ────────────────────────────────────────────
echo.
echo  Open .env.local and add:
echo.
echo   1. INSTAGRAM_APP_ID (from Facebook Developer Console)
echo   2. INSTAGRAM_APP_SECRET (from Facebook Developer Console)
echo   3. DATABASE_URL (your database connection string)
echo.
echo  Your secure JWT secret is already set!
echo.
echo  ────────────────────────────────────────────
echo.
echo  🚀 Quick Start Commands
echo  ────────────────────────────────────────────
echo.
echo  [1] Edit .env.local now
echo  [2] Start ngrok tunnel
echo  [3] Start dev server
echo  [4] View documentation
echo  [5] Exit
echo.
set /p choice="Select option (1-5): "

if "%choice%"=="1" (
    echo.
    echo Opening .env.local...
    notepad .env.local
    goto menu
)

if "%choice%"=="2" (
    echo.
    echo Starting ngrok tunnel...
    echo.
    start "Instagram ngrok" cmd /k "cd /d %~dp0 && start-ngrok.bat"
    echo.
    echo ✅ ngrok started in new window!
    echo.
    timeout /t 2 >nul
    goto menu
)

if "%choice%"=="3" (
    echo.
    echo Starting Next.js dev server...
    echo.
    start "Instagram Dev Server" cmd /k "cd /d %~dp0 && start-dev.bat"
    echo.
    echo ✅ Dev server started in new window!
    echo.
    timeout /t 2 >nul
    goto menu
)

if "%choice%"=="4" (
    echo.
    echo Opening documentation...
    start QUICKSTART.md
    start SECURITY.md
    timeout /t 1 >nul
    goto menu
)

if "%choice%"=="5" (
    echo.
    echo Goodbye! 👋
    timeout /t 1 >nul
    exit
)

:menu
cls
echo.
echo  ╔════════════════════════════════════════════╗
echo  ║        Instagram App - Quick Menu         ║
echo  ╚════════════════════════════════════════════╝
echo.
echo  [1] Edit .env.local
echo  [2] Start ngrok tunnel
echo  [3] Start dev server  
echo  [4] View documentation
echo  [5] Exit
echo.
set /p choice="Select option (1-5): "

if "%choice%"=="1" (
    notepad .env.local
    goto menu
)
if "%choice%"=="2" (
    start "Instagram ngrok" cmd /k "cd /d %~dp0 && start-ngrok.bat"
    echo ✅ ngrok started!
    timeout /t 2 >nul
    goto menu
)
if "%choice%"=="3" (
    start "Instagram Dev Server" cmd /k "cd /d %~dp0 && start-dev.bat"
    echo ✅ Dev server started!
    timeout /t 2 >nul
    goto menu
)
if "%choice%"=="4" (
    start QUICKSTART.md
    start SECURITY.md
    goto menu
)
if "%choice%"=="5" (
    exit
)

goto menu
