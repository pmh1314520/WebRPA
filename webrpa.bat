@echo off
REM WebRPA 命令行封装 —— 在项目根目录直接用 webrpa <子命令>
REM 例：webrpa run 我的工作流.json      webrpa stats      webrpa history
setlocal
set "ROOT=%~dp0"
"%ROOT%Python313\python.exe" "%ROOT%backend\cli.py" %*
endlocal
