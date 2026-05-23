# Start the app for manual testing (Windows)
# Usage:
#   .\scripts\start-dev.ps1           # cloud (uses .env.development in worktree)
#   .\scripts\start-dev.ps1 -Local    # local Supabase (requires Docker + supabase start)

param(
    [switch]$Local
)

Set-Location (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if ($Local) {
    if (Test-Path ".env.local-supabase") {
        Copy-Item ".env.local-supabase" ".env.development" -Force
        Copy-Item ".env.local-supabase" ".env" -Force
        Write-Host "Using local Supabase env (.env.local-supabase)"
    } else {
        Write-Host "Missing .env.local-supabase — copy your local .env.development there first."
        exit 1
    }
} elseif (Test-Path ".env.production") {
    Copy-Item ".env.production" ".env.development" -Force
    Copy-Item ".env.production" ".env" -Force
    Write-Host "Using cloud env (.env.production)"
} else {
    Write-Host "Missing .env.production"
    exit 1
}

$env:NODE_ENV = "development"
Write-Host "Starting http://localhost:5000 ..."
npx tsx server/index.ts
