@echo off
echo Запуск AI Interview Platform Frontend...
echo.

REM Проверка наличия Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo Ошибка: Node.js не установлен
    echo Скачайте и установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

REM Проверка наличия npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo Ошибка: npm не найден
    pause
    exit /b 1
)

REM Установка зависимостей
if not exist node_modules (
    echo Установка зависимостей...
    npm install
)

REM Запуск dev сервера
echo.
echo Запуск React приложения на http://localhost:3000
echo Для остановки нажмите Ctrl+C
echo.
npm run dev
