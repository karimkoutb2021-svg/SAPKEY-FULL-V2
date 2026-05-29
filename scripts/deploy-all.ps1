# ════════════════════════════════════════════════════════
# SAPKEY — Full Deployment Script (Windows PowerShell)
# ════════════════════════════════════════════════════════
# الخطوات:
#   1. تشغيل الـ Schema Migration على Supabase الجديد
#   2. ترحيل البيانات من الـ backup
#   3. نشر على Vercel
# ════════════════════════════════════════════════════════

param(
    [string]$SupabaseDBPassword = "",
    [string]$VercelToken = "",
    [switch]$SkipSupabase,
    [switch]$SkipVercel
)

Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SAPKEY Full Deployment Script            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# ─── 1. SUPABASE MIGRATION ──────────────────────────────
if (-not $SkipSupabase) {
    Write-Host "📦 Step 1: Supabase Schema Migration" -ForegroundColor Yellow

    if (-not $SupabaseDBPassword) {
        $SupabaseDBPassword = Read-Host "🔑 Enter Supabase database password" -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SupabaseDBPassword)
        $SupabaseDBPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    }

    $encodedPwd = [System.Uri]::EscapeDataString($SupabaseDBPassword)
    $dbUrl = "postgresql://postgres.cshpnhzhzahnpvfflsgx.supabase.co:${encodedPwd}@aws-0-me-west1.pooler.supabase.com:6543/postgres?pgbouncer=true"

    Write-Host "   Applying master migration..."
    npx supabase db push --db-url $dbUrl --include-all
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️ Trying direct connection..."
        $dbUrl = "postgresql://postgres:${encodedPwd}@db.cshpnhzhzahnpvfflsgx.supabase.co:5432/postgres"
        npx supabase db push --db-url $dbUrl --include-all
    }

    Write-Host "   ✅ Schema migration complete!" -ForegroundColor Green
    Write-Host ""

    # ─── 2. DATA MIGRATION ─────────────────────────────
    Write-Host "📦 Step 2: Data Migration" -ForegroundColor Yellow
    node scripts/migrate-data.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Data migration failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ Data migration complete!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping Supabase migration" -ForegroundColor Gray
}

# ─── 3. VERIFY ─────────────────────────────────────────
Write-Host "📦 Step 3: Verification" -ForegroundColor Yellow
node -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
(async () => {
  const tables = ['products','categories','product_categories','orders','users','customers'];
  for (const t of tables) {
    const { data, error, count } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log('  ' + (error ? '❌' : '✅') + ' ' + t + ': ' + (error ? error.message : (count + ' rows')));
  }
})();
" 2>&1
Write-Host ""

# ─── 4. VERCEL DEPLOY ──────────────────────────────────
if (-not $SkipVercel) {
    Write-Host "📦 Step 4: Vercel Deploy" -ForegroundColor Yellow

    if (-not $VercelToken) {
        $VercelToken = Read-Host "🔑 Enter Vercel token (or press Enter to skip)" -AsSecureString
        if ($VercelToken) {
            $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($VercelToken)
            $VercelToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        }
    }

    if ($VercelToken) {
        # Read secrets from .env.local (gitignored, safe)
        $envLocal = Join-Path $PSScriptRoot '..\.env.local'
        if (Test-Path $envLocal) {
            $envContent = Get-Content $envLocal
            $envVars = @{}
            foreach ($line in $envContent) {
                if ($line -match '^([^#=]+)="?([^"]*)"?$') {
                    $envVars[$matches[1]] = $matches[2]
                }
            }
            foreach ($key in $envVars.Keys) {
                vercel env add $key production << $envVars[$key] 2>$null
            }
            Write-Host "   ✅ Vercel env vars set from .env.local" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  No .env.local found! Set env vars manually in Vercel Dashboard." -ForegroundColor Yellow
        }

        vercel --token $VercelToken --prod
        Write-Host "   ✅ Vercel deploy complete!" -ForegroundColor Green
    } else {
        Write-Host "   ⏭️  Vercel deploy skipped (no token)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   To deploy manually:"
        Write-Host "   1. Set env vars in Vercel Dashboard → Project Settings → Environment Variables"
        Write-Host "   2. Use values from .env.local (ALL vars, not just NEXT_PUBLIC_)"
        Write-Host "   3. Then: vercel --prod"
        Write-Host ""
        Write-Host "   Or use Vercel Dashboard directly: https://vercel.com/karimkoutb2021-svg/SAPKEY-FULL-V2/deployments"
    }
} else {
    Write-Host "⏭️  Skipping Vercel deploy" -ForegroundColor Gray
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   DEPLOYMENT COMPLETE                       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
