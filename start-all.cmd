@echo off
cd /d "C:\Users\USER\OneDrive\Desktop\geo audit agent"

echo Starting GEO Audit Agent Server...
start "GEO Server" cmd /c "node --env-file .env.local node_modules\tsx\dist\cli.mjs server.ts"

timeout /t 5 /nobreak >nul

echo Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /c "cloudflared.cmd tunnel --url http://localhost:3000"

echo.
echo Both started. Close the tunnel window when done.
pause
