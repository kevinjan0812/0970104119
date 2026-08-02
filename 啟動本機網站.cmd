@echo off
chcp 65001 >nul
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  start "Local website server" py -m http.server 8765 --bind 127.0.0.1
  timeout /t 1 /nobreak >nul
  start "" "http://127.0.0.1:8765/index.html"
  exit /b 0
)

where python >nul 2>nul
if %errorlevel%==0 (
  python --version >nul 2>nul
  if %errorlevel%==0 (
    start "Local website server" python -m http.server 8765 --bind 127.0.0.1
    timeout /t 1 /nobreak >nul
    start "" "http://127.0.0.1:8765/index.html"
    exit /b 0
  )
)

start "Local website server - keep this window open" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-local.ps1"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8765/index.html"
