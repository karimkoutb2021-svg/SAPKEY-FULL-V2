param([string]$Mode = 'full')

$ErrorActionPreference = 'Stop'

function Write-Step($m) { Write-Host "`n▸ $m" -ForegroundColor Cyan }
function Write-Success($m) { Write-Host "  ✓ $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "  ⚠ $m" -ForegroundColor Yellow }
function Write-Error($m) { Write-Host "  ✗ $m" -ForegroundColor Red; exit 1 }

$ROOT_DIR = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Clear-Host
Write-Host "╔════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   SuperMarket ERP - Deploy 🚀     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════╝" -ForegroundColor Green

# 1. Check Node.js
Write-Step "1/5 Checking Node.js..."
$nodeVer = node --version 2>$null
if (-not $nodeVer) { Write-Error "Node.js not found" }
Write-Success "Node.js $nodeVer"

# 2. Check .env.local
Write-Step "2/5 Checking .env.local..."
$envPath = Join-Path $ROOT_DIR ".env.local"
if (-not (Test-Path $envPath)) {
    $envExample = Join-Path $ROOT_DIR ".env.local.example"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envPath
        Write-Warn "Created .env.local - EDIT IT with your Firebase keys!"
    } else {
        Write-Warn "No .env.local found"
    }
} else {
    Write-Success ".env.local exists"
}

# 3. Firebase login
Write-Step "3/5 Firebase login..."
firebase projects:list 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Logging in..." -ForegroundColor Yellow
    firebase login --no-localhost
} else {
    Write-Success "Already logged in"
}

# 4. Install + Build
Write-Step "4/5 Installing & Building..."
Push-Location $ROOT_DIR
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed" }
npx next build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed" }
Pop-Location

# 5. Deploy
Write-Step "5/5 Deploying to Firebase..."
Push-Location $ROOT_DIR
if ($Mode -eq 'check') {
    Write-Success "Ready for deploy! Run without -Mode check"
    exit 0
}
$deployArgs = @('deploy', '--force')
if ($Mode -ne 'full') { $deployArgs += @('--only', $Mode) }
& firebase $deployArgs 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "✅ DEPLOYED SUCCESSFULLY! 🚀"
    Write-Host "`n  Open: https://supermarket-erp.web.app" -ForegroundColor Cyan
} else {
    Write-Error "Deploy failed"
}
Pop-Location
