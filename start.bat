@echo off
chcp 65001 > nul
echo ====================================================
echo  Запуск расписания Schedule с картой AITU
echo ====================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
  echo Запуск локального веб-сервера через Node.js...
  node server.js
  goto end
)

where python >nul 2>nul
if %errorlevel% equ 0 (
  echo Запуск локального веб-сервера через Python...
  start "" "http://localhost:8000"
  python -m http.server 8000
  goto end
)

echo Node.js или Python не найдены.
echo Открытие index.html напрямую в браузере...
start "" "index.html"

:end

