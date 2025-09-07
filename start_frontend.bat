@echo off
echo =======================================
echo AI Interview Platform - Frontend
echo =======================================
echo.

REM Переход в папку frontend
cd frontend

REM Проверка наличия node_modules
if not exist "node_modules" (
    echo Устанавливаем зависимости...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo Ошибка установки зависимостей!
        pause
        exit /b 1
    )
)

echo Запускаем фронтенд сервер...
echo.
echo Приложение будет доступно по адресу: http://localhost:3000
echo Тестовая страница: http://localhost:3000/test
echo.

npm run dev

pause
