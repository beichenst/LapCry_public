#requires -Version 5.1
<#
    LapCry one-click build script.

    Rebuilds the whole product from the bundled source tree:
      1. installs npm dependencies
      2. builds the production web bundle (webpack -> build/prod)
      3. optionally runs the non-UI test suite
      4. compiles and publishes the self-contained Windows x64 desktop EXE

    The published single-file executable is written to .\dist\LapCry.exe.

    Examples:
      powershell -ExecutionPolicy Bypass -File .\一键构建.ps1
      powershell -ExecutionPolicy Bypass -File .\一键构建.ps1 -SkipTests
      powershell -ExecutionPolicy Bypass -File .\一键构建.ps1 -InstallMode ci
#>
[CmdletBinding()]
param(
    [ValidateSet("install", "ci")]
    [string]$InstallMode = "install",
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Split-Path -Parent $scriptDir
$sourceRoot = Join-Path $packageRoot "02_源代码"
$distDir = Join-Path $packageRoot "dist"

function Assert-Command {
    param([string]$Name, [string]$Hint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "'$Name' was not found on PATH. $Hint"
    }
}

function Invoke-Step {
    param([string]$Title, [scriptblock]$Action)
    Write-Host ""
    Write-Host "==> $Title" -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
        throw "Step failed: $Title (exit code $LASTEXITCODE)"
    }
}

Write-Host "LapCry build" -ForegroundColor Green
Write-Host "  source : $sourceRoot"
Write-Host "  output : $distDir"

if (-not (Test-Path (Join-Path $sourceRoot "package.json"))) {
    throw "Source tree not found. Expected package.json under: $sourceRoot"
}

Assert-Command "node" "Install Node.js 24 or 26 (see .nvmrc): https://nodejs.org/"
Assert-Command "npm"  "Install Node.js which bundles npm."

$nodeVersion = (& node -v).Trim()
$npmVersion = (& npm -v).Trim()
Write-Host "  node   : $nodeVersion"
Write-Host "  npm    : $npmVersion"

$npmCmd = (Get-Command npm).Source
function Invoke-Npm {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & $npmCmd @Args
}

Push-Location $sourceRoot
try {
    if ($InstallMode -eq "ci") {
        Invoke-Step "npm ci" { Invoke-Npm "ci" }
    } else {
        Invoke-Step "npm install" { Invoke-Npm "install" }
    }

    Invoke-Step "Lint" { Invoke-Npm "run" "lint" }

    Invoke-Step "Build production web bundle" { Invoke-Npm "run" "build" }

    if (-not $SkipTests) {
        Invoke-Step "Run non-UI tests (Node API + operations)" { Invoke-Npm "test" }
    } else {
        Write-Host "==> Tests skipped (-SkipTests)" -ForegroundColor Yellow
    }

    Assert-Command "dotnet" "Install the .NET 8 SDK: https://dotnet.microsoft.com/download"

    Invoke-Step "Publish self-contained desktop EXE" {
        & dotnet publish "desktop/LapCry.Desktop/LapCry.Desktop.csproj" `
            -c Release -r win-x64 --self-contained true
    }

    $published = Join-Path $sourceRoot "desktop/LapCry.Desktop/bin/Release/net8.0-windows/win-x64/publish/LapCry.exe"
    if (-not (Test-Path $published)) {
        throw "Published executable not found: $published"
    }

    New-Item -ItemType Directory -Force -Path $distDir | Out-Null
    Copy-Item $published (Join-Path $distDir "LapCry.exe") -Force

    $hash = (Get-FileHash (Join-Path $distDir "LapCry.exe") -Algorithm SHA256).Hash.ToLower()
    "{0}  LapCry.exe" -f $hash | Set-Content -Encoding ASCII (Join-Path $distDir "SHA256SUMS.txt")
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Build complete." -ForegroundColor Green
Write-Host "  Executable : $(Join-Path $distDir 'LapCry.exe')"
Write-Host "  SHA-256    : $(Join-Path $distDir 'SHA256SUMS.txt')"
