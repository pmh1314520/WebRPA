@echo off
chcp 65001 >nul
title 构建 WebRPA 启动器

echo ========================================
echo      构建 WebRPA 启动器 (Electron)
echo ========================================
echo.

:: 获取脚本所在目录
set "LAUNCHER_DIR=%~dp0"
set "ROOT_DIR=%LAUNCHER_DIR%.."
set "NODEJS_DIR=%ROOT_DIR%\nodejs"

:: 设置环境变量
set "PATH=%NODEJS_DIR%;%PATH%"

echo [信息] 正在安装依赖...
cd /d "%LAUNCHER_DIR%"
call "%NODEJS_DIR%\npm.cmd" install

echo.
echo [信息] 正在构建应用（vite build + electron-builder）...
call "%NODEJS_DIR%\npm.cmd" run build

echo.
echo ========================================
echo      构建完成！
echo ========================================
echo.
echo 可执行文件位于: release\WebRPA启动器.exe
echo.
pause
