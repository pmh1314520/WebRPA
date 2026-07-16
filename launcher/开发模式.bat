@echo off
chcp 65001 >nul
title WebRPA 启动器 - 开发模式

echo ========================================
echo   WebRPA 启动器 - 开发模式 (Electron)
echo ========================================
echo.

:: 获取脚本所在目录
set "LAUNCHER_DIR=%~dp0"
set "ROOT_DIR=%LAUNCHER_DIR%.."
set "NODEJS_DIR=%ROOT_DIR%\nodejs"

:: 设置环境变量
set "PATH=%NODEJS_DIR%;%PATH%"

echo [信息] 正在启动开发服务器（Vite + Electron）...
cd /d "%LAUNCHER_DIR%"
call "%NODEJS_DIR%\npm.cmd" run dev

pause
