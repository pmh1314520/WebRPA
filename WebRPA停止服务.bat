@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title WebRPA 停止服务

REM =============================================================
REM  WebRPA 停止服务脚本（配合 WebRPA备用启动.bat 使用）
REM  按 WebRPAConfig.json 中配置的端口，结束占用该端口的进程，
REM  从而干净地停止后端与前端服务。
REM =============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "PYEXE=%ROOT%\Python313\python.exe"
set "CONFIG=%ROOT%\WebRPAConfig.json"

set "BPORT=5241"
set "FPORT=5921"
if exist "%PYEXE%" if exist "%CONFIG%" (
    for /f "usebackq delims=" %%i in (`"%PYEXE%" -c "import json;print(json.load(open(r'%CONFIG%',encoding='utf-8')).get('backend',{}).get('port',5241))" 2^>nul`) do set "BPORT=%%i"
    for /f "usebackq delims=" %%i in (`"%PYEXE%" -c "import json;print(json.load(open(r'%CONFIG%',encoding='utf-8')).get('frontend',{}).get('port',5921))" 2^>nul`) do set "FPORT=%%i"
)

echo ============================================================
echo   正在停止 WebRPA 服务（后端端口 !BPORT! / 前端端口 !FPORT!）
echo ============================================================

call :killport !BPORT! 后端
call :killport !FPORT! 前端

echo.
echo [完成] 已尝试停止 WebRPA 前后端服务。
pause
endlocal
exit /b 0

:killport
REM %1=端口 %2=名称
set "_found="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%~1 " ^| findstr "LISTENING"') do (
    if not "%%p"=="0" (
        taskkill /F /T /PID %%p >nul 2>&1
        set "_found=1"
        echo [停止] 已结束 %~2 进程 PID=%%p（端口 %~1）
    )
)
if not defined _found echo [提示] 端口 %~1 上未发现正在运行的 %~2 服务。
exit /b 0
