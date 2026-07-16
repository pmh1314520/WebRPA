# ============================================================
#  准备 Electron 打包环境（幂等）
#  解决：Windows 非管理员 / 未开启开发者模式时，electron-builder 解压
#        winCodeSign 归档里的 macOS 符号链接（*.dylib）会报
#        "Cannot create symbolic link ... 客户端没有所需的特权" 导致打包失败。
#  做法：若 winCodeSign 缓存缺失，则手动下载并用 7za 解压（排除 darwin 目录，
#        Windows 打包根本用不到 macOS 那部分），预先填好缓存，让 electron-builder
#        直接复用、不再自行解压，从而绕开符号链接权限限制。
#  说明：本脚本无副作用、可重复执行；缓存已就绪时直接跳过。
# ============================================================
$ErrorActionPreference = 'Stop'

$LauncherDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Version = '2.6.0'
$CacheRoot = Join-Path $env:LOCALAPPDATA "electron-builder\Cache\winCodeSign"
$Target = Join-Path $CacheRoot ("winCodeSign-" + $Version)

# 已就绪（含 windows-10 签名工具目录）则跳过
if ((Test-Path $Target) -and (Test-Path (Join-Path $Target 'windows-10'))) {
    Write-Host "[prepare-build-env] winCodeSign 缓存已就绪，跳过" -ForegroundColor DarkGray
    exit 0
}

# 定位 7za（随 electron-builder 依赖 7zip-bin 一起安装）
$SevenZa = Join-Path $LauncherDir "node_modules\7zip-bin\win\x64\7za.exe"
if (-not (Test-Path $SevenZa)) {
    Write-Host "[prepare-build-env] 未找到 7za（请先 npm install），跳过预处理" -ForegroundColor Yellow
    exit 0
}

$Url = "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-$Version/winCodeSign-$Version.7z"
$Tmp = Join-Path $CacheRoot ("winCodeSign-" + $Version + ".7z")

try {
    New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
    if (-not (Test-Path $Tmp)) {
        Write-Host "[prepare-build-env] 下载 winCodeSign-$Version.7z ..." -ForegroundColor Cyan
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $Url -OutFile $Tmp -UseBasicParsing
    }
    if (Test-Path $Target) { Remove-Item $Target -Recurse -Force }
    New-Item -ItemType Directory -Path $Target -Force | Out-Null
    # 排除 darwin（macOS 符号链接），避免符号链接权限错误
    & $SevenZa x $Tmp ("-o" + $Target) "-x!darwin" -y | Out-Null
    Write-Host "[prepare-build-env] winCodeSign 缓存已准备好（已跳过 darwin 符号链接）" -ForegroundColor Green
} catch {
    Write-Host ("[prepare-build-env] 预处理失败（将回退由 electron-builder 自行处理）：{0}" -f $_.Exception.Message) -ForegroundColor Yellow
}
