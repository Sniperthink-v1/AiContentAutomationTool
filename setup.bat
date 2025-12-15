@echo off
echo.
echo ========================================
echo  SniperThinkAI - Setup Script
echo ========================================
echo.

echo [1/3] Installing dependencies...
call npm install bcryptjs jose
call npm install --save-dev @types/bcryptjs

echo.
echo [2/3] Initializing Neon Database...
node scripts\init-neon-db.js

echo.
echo [3/3] Setup complete!
echo.
echo ========================================
echo  NEXT STEPS:
echo ========================================
echo.
echo  1. Run: npm run dev
echo  2. Visit: http://localhost:3003
echo  3. Create your account
echo.
echo  You'll start with 1000 free credits!
echo ========================================
echo.
pause
