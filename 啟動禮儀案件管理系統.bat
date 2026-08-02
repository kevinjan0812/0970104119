@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

set "SITE_URL=http://127.0.0.1:8765/index.html"
set "SERVER_SCRIPT=%~dp0serve-local.ps1"

if not exist "%SERVER_SCRIPT%" (
  echo [錯誤] 找不到 serve-local.ps1
  echo 請確認此 BAT 與 serve-local.ps1 放在同一個資料夾。
  pause
  exit /b 1
)

rem 已經啟動時直接使用，避免重複占用 8765 連接埠。
curl.exe -fsS --max-time 2 "%SITE_URL%" >nul 2>nul
if errorlevel 1 goto start_server
goto server_ready

:start_server
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%SERVER_SCRIPT%"

rem 最多等待 15 秒；確定網站可連線後才開啟瀏覽器。
set /a WAIT_COUNT=0
:wait_for_server
timeout /t 1 /nobreak >nul
curl.exe -fsS --max-time 2 "%SITE_URL%" >nul 2>nul
if not errorlevel 1 goto server_ready
set /a WAIT_COUNT+=1
if %WAIT_COUNT% LSS 15 goto wait_for_server

echo [錯誤] 本機網站無法啟動。
echo 請確認 Windows 防火牆沒有封鎖 PowerShell，且 8765 連接埠未被其他程式占用。
pause
exit /b 1

:server_ready
if /I "%~1"=="--no-open" exit /b 0
start "" "%SITE_URL%"
exit /b 0
