@echo off
chcp 65001 >nul
title 重新生成启动器图标

echo ========================================
echo      重新生成启动器图标 (logo.ico)
echo ========================================
echo.

set "LAUNCHER_DIR=%~dp0"
set "ROOT_DIR=%~dp0.."
set "PYTHON_EXE=%ROOT_DIR%\Python313\python.exe"

if not exist "%PYTHON_EXE%" (
    echo [错误] 未找到 Python，请确保 Python313 目录存在
    pause
    exit /b 1
)

echo [信息] 正在生成图标...
echo.

cd /d "%LAUNCHER_DIR%"
"%PYTHON_EXE%" -c "from PIL import Image, ImageDraw; img = Image.new('RGBA', (512, 512), (0,0,0,0)); draw = ImageDraw.Draw(img); draw.ellipse([0,0,512,512], fill=(245,87,108,255)); box_size = 204; center = 256; line_width = 25; points = [(center, center-box_size//2), (center+box_size//2, center), (center, center+box_size//2), (center-box_size//2, center)]; draw.polygon(points, fill=(255,255,255,50), outline=(255,255,255,255), width=line_width); draw.line([points[0], points[2]], fill=(255,255,255,255), width=line_width); draw.line([points[1], points[3]], fill=(255,255,255,255), width=line_width); sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)]; icons=[img.resize(s, Image.Resampling.LANCZOS) for s in sizes]; icons[0].save('logo.ico', format='ICO', sizes=sizes, append_images=icons[1:]); img.save('public/webrpa-logo.png'); print('图标生成完成！')"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo      图标生成成功！
    echo ========================================
    echo.
    echo 图标位置: launcher\logo.ico
    echo.
) else (
    echo.
    echo [错误] 图标生成失败
    echo.
)

pause
