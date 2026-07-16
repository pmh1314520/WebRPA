@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title WebRPA 备用启动器（无需 WebView）

REM =============================================================
REM  WebRPA 备用启动脚本
REM  适用场景：企业内网无法安装 WebView2，导致 WebRPA 启动器
REM            (WebRPA启动器.exe) 无法运行时，用本脚本直接拉起
REM            前后端服务，功能与启动器一键启动完全一致。
REM  用法：双击本文件即可。停止服务请运行 WebRPA停止服务.bat
REM =============================================================

REM 以脚本所在目录为项目根目录（去掉结尾反斜杠）
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "PYEXE=%ROOT%\Python313\python.exe"
set "NPMCMD=%ROOT%\nodejs\npm.cmd"
set "BACKEND=%ROOT%\backend\run.py"
set "FRONTEND=%ROOT%\frontend"
set "CONFIG=%ROOT%\WebRPAConfig.json"

echo ============================================================
echo   WebRPA 备用启动器（bat 方式，无需 WebView）
echo   项目目录: %ROOT%
echo ============================================================
echo.

REM ---------- 环境检查 ----------
if not exist "%PYEXE%" (
    echo [错误] 未找到内置 Python: %PYEXE%
    echo         请确认在完整的 WebRPA 发布目录下运行本脚本。
    goto :fail
)
if not exist "%BACKEND%" (
    echo [错误] 未找到后端启动脚本: %BACKEND%
    goto :fail
)
if not exist "%NPMCMD%" (
    echo [错误] 未找到内置 npm: %NPMCMD%
    goto :fail
)
if not exist "%FRONTEND%\package.json" (
    echo [错误] 未找到前端项目: %FRONTEND%\package.json
    goto :fail
)

REM ---------- 读取端口（用内置 Python 解析 JSON，避免 bat 解析出错）----------
set "BPORT=5241"
set "FPORT=5921"
if exist "%CONFIG%" (
    for /f "usebackq delims=" %%i in (`"%PYEXE%" -c "import json;print(json.load(open(r'%CONFIG%',encoding='utf-8')).get('backend',{}).get('port',5241))" 2^>nul`) do set "BPORT=%%i"
    for /f "usebackq delims=" %%i in (`"%PYEXE%" -c "import json;print(json.load(open(r'%CONFIG%',encoding='utf-8')).get('frontend',{}).get('port',5921))" 2^>nul`) do set "FPORT=%%i"
)
echo [信息] 后端端口: !BPORT!   前端端口: !FPORT!
echo.

REM ---------- 同步配置到前端 public，保证浏览器端能拿到正确的后端端口 ----------
if exist "%CONFIG%" (
    if not exist "%FRONTEND%\public" mkdir "%FRONTEND%\public" >nul 2>&1
    copy /y "%CONFIG%" "%FRONTEND%\public\WebRPAConfig.json" >nul 2>&1
)

REM ---------- 让内置 Node 进入 PATH（供 npm/vite 调用 node）----------
set "PATH=%ROOT%\nodejs;%PATH%"
set "NODE_OPTIONS=--no-warnings"

REM ---------- 首次运行：若前端依赖缺失则自动安装 ----------
if not exist "%FRONTEND%\node_modules" (
    echo [提示] 检测到前端依赖尚未安装，正在安装（首次运行可能需要几分钟）...
    pushd "%FRONTEND%"
    call "%NPMCMD%" install
    popd
    echo.
)

REM ---------- 端口占用提示（不阻断，仅提醒）----------
netstat -ano | findstr ":!BPORT! " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [提示] 端口 !BPORT! 已被占用，后端可能已在运行，将跳过重复启动。
    set "SKIP_BACKEND=1"
)
netstat -ano | findstr ":!FPORT! " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [提示] 端口 !FPORT! 已被占用，前端可能已在运行，将跳过重复启动。
    set "SKIP_FRONTEND=1"
)

REM ---------- 启动后端 ----------
if not defined SKIP_BACKEND (
    echo [1/2] 正在启动后端服务（端口 !BPORT!）...
    set "PYTHONIOENCODING=utf-8"
    set "PYTHONUNBUFFERED=1"
    start "WebRPA 后端服务 (端口 !BPORT!)" /d "%ROOT%" cmd /k ""%PYEXE%" "%BACKEND%""
)

REM ---------- 启动前端 ----------
if not defined SKIP_FRONTEND (
    echo [2/2] 正在启动前端服务（端口 !FPORT!）...
    start "WebRPA 前端服务 (端口 !FPORT!)" /d "%FRONTEND%" cmd /k ""%NPMCMD%" run dev"
)

echo.
echo [信息] 服务已在两个独立窗口中启动（分别显示后端 / 前端日志）。
echo [信息] 正在等待前端服务就绪，随后自动打开浏览器...
echo.

REM ---------- 等待前端端口就绪后打开浏览器（最多约 120 秒）----------
set /a _tries=0
:waitfront
timeout /t 2 /nobreak >nul
set /a _tries+=1
netstat -ano | findstr ":!FPORT! " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto :frontready
if !_tries! geq 60 goto :giveup
goto :waitfront

:frontready
set "OPENURL=http://localhost:!FPORT!/?backend_port=!BPORT!"
REM 优先探测常见浏览器 exe 直接启动，规避"未设默认浏览器 / http 关联损坏 → 找不到应用程序"
set "BROWSER="
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if defined BROWSER (
    start "" "!BROWSER!" "!OPENURL!"
) else (
    start "" "!OPENURL!"
)
echo [完成] WebRPA 已启动！访问地址: !OPENURL!
echo.
echo   - 关闭「WebRPA 后端服务 / 前端服务」两个窗口即可停止服务，
echo     或运行同目录下的 WebRPA停止服务.bat 一键停止。
echo.
goto :end

:giveup
echo [警告] 等待前端服务超时。请查看「WebRPA 前端服务」窗口中的日志排查。
echo         就绪后可手动访问: http://localhost:!FPORT!
goto :end

:fail
echo.
echo 启动失败，请检查上述错误信息。
pause
exit /b 1

:end
echo 本窗口可以关闭，不影响已启动的服务。
pause
endlocal
