$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'Node.js and npm are required. Install Node.js 20 or newer, then try again.'
}

if (-not (Test-Path -LiteralPath 'node_modules')) {
    Write-Host 'Installing dependencies...'
    npm ci
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host 'Starting FableForge with hot reload at http://127.0.0.1:5173/'
Write-Host 'Press Ctrl+C when you are finished.'
npm run dev -- --host 127.0.0.1 --open
exit $LASTEXITCODE
