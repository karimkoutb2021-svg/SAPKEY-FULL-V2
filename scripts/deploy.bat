@echo off
REM =============================================
REM SuperMarket ERP - Deployment Script (Windows)
REM =============================================
title SuperMarket ERP Deployment

echo.
echo ============================================
echo    SuperMarket ERP - Deployment
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not found!
    pause
    exit /b 1
)
echo [OK] npm found

REM Check .env.local
if not exist ".env.local" (
    if exist ".env.local.example" (
        copy ".env.local.example" ".env.local" >nul
        echo [WARN] Created .env.local from example - please update it!
    ) else (
        echo [WARN] No .env.local found
    )
)

REM Install dependencies
echo.
echo [1/4] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Install functions dependencies
if exist "functions\package.json" (
    echo.
    echo [*] Installing functions dependencies...
    cd functions
    call npm install
    cd ..
    echo [OK] Functions dependencies installed
)

REM Build
echo.
echo [2/4] Building application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo [OK] Build completed

REM Check firebase-tools
echo.
echo [3/4] Checking Firebase CLI...
npx firebase --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [*] Installing Firebase CLI...
    call npm install -g firebase-tools
)
echo [OK] Firebase CLI ready

REM Deploy
echo.
echo [4/4] Deploying to Firebase...
echo.
echo Choose deployment:
echo   1 - Full deployment (all services)
echo   2 - Hosting only
echo   3 - Functions only
echo   4 - Firestore rules only
echo   5 - Check only (no deploy)
echo.

set /p choice="Enter choice (1-5): "

if "%choice%"=="1" (
    echo Deploying everything...
    call npx firebase deploy --force
) else if "%choice%"=="2" (
    echo Deploying hosting...
    call npx firebase deploy --only hosting
) else if "%choice%"=="3" (
    echo Deploying functions...
    call npx firebase deploy --only functions
) else if "%choice%"=="4" (
    echo Deploying Firestore rules...
    call npx firebase deploy --only firestore
) else if "%choice%"=="5" (
    echo [OK] Check complete - ready for deployment!
    goto :end
) else (
    echo [ERROR] Invalid choice
    pause
    exit /b 1
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo    DEPLOYMENT SUCCESSFUL! ^(^)
    echo ============================================
    echo.
    echo Your app is now live on Firebase!
) else (
    echo.
    echo [ERROR] Deployment failed
    pause
    exit /b 1
)

:end
echo.
pause
