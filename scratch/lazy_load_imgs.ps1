$files = @(
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\accounting\expenses\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\admin\banners\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\admin\branding\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\admin\categories\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\cart\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\guide\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\manager\audit\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\manager\coding\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\ocr-scan\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\offers\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\portfolio\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\pos\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\products\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\settings\branding\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\shop\product\[id]\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\shop\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\system-identity\page.tsx",
    "C:\Users\PC\Downloads\31.01.2026 Koshary\14.05.2026 open\src\app\page.tsx"
)

foreach ($f in $files) {
    if (Test-Path $f) {
        $content = Get-Content $f -Raw
        if ($content -match "<img(?![^>]*loading=)") {
            $content = [regex]::Replace($content, "<img\s+", "<img loading=`"lazy`" ")
            Set-Content -Path $f -Value $content
            Write-Host "Updated $f"
        }
    }
}
Write-Host "Done"
