@echo off
echo =======================================
echo AI Interview Platform - Full Stack
echo =======================================
echo.

REM Запуск backend в новом окне
echo Запускаем backend сервер...
start "Backend Server" cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Небольшая задержка для запуска backend
timeout /t 5 /nobreak > nul

REM Запуск frontend в новом окне  
echo Запускаем frontend сервер...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo =======================================
echo Серверы запущены:
echo - Backend API: http://localhost:8000
echo - Frontend: http://localhost:3000
echo - Тестовая страница: http://localhost:3000/test
echo =======================================
echo.
echo Для остановки закройте окна серверов.
pause
