@echo off
title SuperMarket ERP Deployment
cls

echo ----------------------------------------------------
echo SuperMarket ERP - Firebase Deployment
echo ----------------------------------------------------
echo.

echo [1/5] Checking Firebase CLI...
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Firebase CLI not found. Installing...
    call npm install -g firebase-tools
) else (
    echo Firebase CLI is installed.
)

echo.
echo [2/5] Firebase Login...
echo Switching account. Please select karimkoutb2021@gmail.com in the browser.
call firebase logout
call firebase login

echo.
echo [3/5] Installing dependencies...
call npm install

echo.
echo [4/5] Building application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo BUILD FAILED!
    pause
    exit /b 1
)

echo.
echo [5/5] Deploying...
echo Your available projects:
call firebase projects:list
call firebase use sabb-d6dd6 --alias default
call firebase deploy -P sabb-d6dd6 --force

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ----------------------------------------------------
    echo SUCCESSFUL DEPLOYMENT!
    echo ----------------------------------------------------
) else (
    echo DEPLOYMENT FAILED!
)

pause
