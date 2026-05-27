param([string]$Mode = 'full')

Write-Host "╔════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  SuperMarket - Build & Deploy 🔧  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ROOT

# 1. BUILD
Write-Host "▸ [1/4] Building Next.js..." -ForegroundColor Cyan
npx next build
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Build failed!" -ForegroundColor Red; exit 1 }
Write-Host "  ✓ Build complete" -ForegroundColor Green

# 2. COPY HTML FILES  
Write-Host "▸ [2/4] Copying HTML files to root..." -ForegroundColor Cyan

# Copy all HTML files from server/app to .next root
$files = Get-ChildItem -Path ".next\server\app" -Recurse -Filter "*.html"
foreach ($f in $files) {
    $rel = $f.FullName.Replace("$ROOT\.next\server\app\", "")
    $dest = ".next\$rel"
    $dir = Split-Path $dest -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force > $null }
    Copy-Item -Path $f.FullName -Destination $dest -Force
}
Copy-Item -Path ".next\server\app\index.html" -Destination ".next\index.html" -Force
Write-Host "  ✓ HTML files: $($files.Count) files copied" -ForegroundColor Green

# 3. FIX _next/static PATH
Write-Host "▸ [3/4] Fixing static assets path..." -ForegroundColor Cyan

# Create _next/static and copy files
if (Test-Path ".next\_next") { Remove-Item -Recurse -Force ".next\_next" }
New-Item -ItemType Directory -Path ".next\_next\static" -Force > $null
Copy-Item -Recurse -Path ".next\static\*" -Destination ".next\_next\static" -Force

# Count files
$staticCount = (Get-ChildItem -Path ".next\_next\static" -Recurse -File | Measure-Object).Count
Write-Host "  ✓ Static assets: $staticCount files in _next/static/" -ForegroundColor Green

# 4. DEPLOY
if ($Mode -eq 'build') {
    Write-Host "`n✓ Build ready! Deploy with: firebase deploy --only hosting" -ForegroundColor Green
    exit 0
}

Write-Host "▸ [4/4] Deploying to Firebase..." -ForegroundColor Cyan
firebase deploy --only hosting
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "   Open: https://supermarket-erp-1846a.web.app" -ForegroundColor Cyan
} else {
    Write-Host "✗ Deploy failed" -ForegroundColor Red
}
