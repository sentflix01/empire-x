<#
Export local Postgres (local_dump.bak) -> Supabase using pg_dump / pg_restore

Usage (PowerShell):
  1. Open PowerShell
  2. cd to repo root (where this script lives)
  3. ./scripts/export_and_restore_to_supabase.ps1

What it does:
  - Checks for pg_dump and pg_restore on PATH
  - Runs pg_dump (custom format) to ./local_dump.bak
  - Prompts for Supabase connection string (keeps it out of shell history)
  - Runs pg_restore with --no-owner --no-acl to Supabase

Security notes:
  - This script does not persist Supabase credentials anywhere.
  - DO NOT commit the dump file or paste credentials into public logs.

Supabase connection string format:
  postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require
  (Get this from: Supabase → Project Settings → Database → Connection string → URI)
#>

function ExitWith($msg) {
  Write-Host "ERROR: $msg" -ForegroundColor Red
  exit 1
}

# Check required tools
foreach ($tool in @('pg_dump', 'pg_restore')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    ExitWith "$tool not found on PATH. Install PostgreSQL client tools."
  }
}

Write-Host "=== Nodbusiness: Export local Postgres -> Restore to Supabase ===" -ForegroundColor Cyan

# 1) Find local DATABASE_URL from backend/.env if possible
$localEnv = Join-Path $PSScriptRoot '..\backend\.env'
$localDb = $null
if (Test-Path $localEnv) {
  $line = Get-Content $localEnv | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
  if ($line) { $localDb = $line -replace '^DATABASE_URL=', '' }
}

if (-not $localDb) {
  $localDb = Read-Host "Local DATABASE_URL (postgresql://user:pass@localhost:5432/nodbusiness)"
}
if (-not $localDb) { ExitWith "No local DATABASE_URL provided" }

# 2) Dump local database
$dumpFile = Join-Path $PSScriptRoot '..\local_dump.bak'
Write-Host "Dumping local database to $dumpFile ..." -ForegroundColor Green
& pg_dump -Fc -f $dumpFile $localDb
if ($LASTEXITCODE -ne 0) { ExitWith "pg_dump failed (exit $LASTEXITCODE)" }
Write-Host "Dump created: $dumpFile" -ForegroundColor Green

# 3) Ask for Supabase connection string (masked input)
Write-Host "Provide Supabase connection string" -ForegroundColor Cyan
Write-Host "(Supabase → Project Settings → Database → Connection string → URI)" -ForegroundColor Gray
$secureConn = Read-Host -AsSecureString -Prompt "Supabase connection string (input is hidden)"
$supabaseConn = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureConn))

if (-not $supabaseConn) { ExitWith "No Supabase connection string provided" }

# 4) Restore to Supabase
Write-Host "Restoring to Supabase (this may take a while)..." -ForegroundColor Green
& pg_restore -d $supabaseConn -v --no-owner --no-acl $dumpFile
if ($LASTEXITCODE -ne 0) { ExitWith "pg_restore failed (exit $LASTEXITCODE)" }

Write-Host "Restore complete." -ForegroundColor Green

# 5) Quick verification
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
  Write-Host "Running quick verification..." -ForegroundColor Cyan
  & psql $supabaseConn -c "SELECT 'users_count:' as name, COUNT(*) FROM users;" 2>$null || Write-Host "Warning: users table query failed" -ForegroundColor Yellow
  & psql $supabaseConn -c "\dt" 2>$null || Write-Host "Warning: could not list tables" -ForegroundColor Yellow
} else {
  Write-Host "psql not found — verify data manually in Supabase Table Editor." -ForegroundColor Yellow
}

Write-Host "All done. Set DATABASE_URL in Render to the Supabase pooler URL (port 6543)." -ForegroundColor Green
