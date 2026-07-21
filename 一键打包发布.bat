@echo off
chcp 65001 >nul
setlocal
title WebRPA 一键发布打包器

REM =============================================================
REM  WebRPA 一键发布打包器
REM  双击运行：自动构建 13 个功能模块包 + 瘦身核心包目录 + 校验和。
REM  产物输出到 packaged\ 目录：
REM    - WebRPA-<版本>-核心包\           （瘦身后的核心目录，请自行手动打包为 7z）
REM    - feature_packs\<id>-v<版本>.zip  （13 个按需安装的功能包）
REM    - feature_packs\packs_index.json  （官网/网盘下载列表索引）
REM    - checksums-v<版本>.txt           （SHA256 校验和，仅含功能包）
REM  核心包目录直接生成在 packaged\ 内并保留（可试跑验证），不再压缩为 zip，
REM  也不再在项目同级创建 WebRPA核心包构建\ 文件夹。
REM
REM  高级用法（命令行传参，与脚本参数一致）：
REM    一键打包发布.bat --packs-only      只打功能包
REM    一键打包发布.bat --core-only       只打核心包
REM    一键打包发布.bat --clean-workdir   打完删除核心构建目录
REM =============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "PYEXE=%ROOT%\Python313\python.exe"

if not exist "%PYEXE%" (
    echo [错误] 未找到内置 Python: %PYEXE%
    echo         请确认在完整版 WebRPA 目录下运行本脚本。
    pause
    exit /b 1
)

set "PYTHONIOENCODING=utf-8"
"%PYEXE%" "%ROOT%\backend\scripts\release_packager.py" %*
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
    echo [完成] 发布产物已生成到 packaged\ 目录。
) else (
    echo [失败] 打包过程出错（返回码 %RC%），请查看上方日志。
)
pause
endlocal
