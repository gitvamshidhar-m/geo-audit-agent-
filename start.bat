@echo off
cd /d "C:\Users\USER\OneDrive\Desktop\geo audit agent"
title GEO Audit Agent

echo ========================================
echo   GEO Audit Agent - Starting...
echo ========================================

:: Kill old processes if any
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im cloudflared.exe >nul 2>&1

:: Start the server
echo [1/2] Starting server...
start "GEO Server" /min cmd /c "node --env-file .env.local node_modules\tsx\dist\cli.mjs server.ts"
timeout /t 5 /nobreak >nul

:: Start tunnel
echo [2/2] Starting tunnel...
echo.
echo Share this URL with anyone:
echo.
cloudflared.cmd tunnel --url http://localhost:3000

pause
