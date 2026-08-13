<#
Export and restore local Postgres (local_dump.bak) -> Neon using pg_dump / pg_restore

Usage (PowerShell):
  1. Open PowerShell (Administrator if you plan to install tools)
  2. cd to repo root (where this script lives)
  3. ./scripts/export_and_restore_to_neon.ps1

What it does:
  - Reads local DATABASE_URL from backend/.env if present, or asks for it
  - Checks for pg_dump and pg_restore on PATH
  - Runs pg_dump (custom format) to ./local_dump.bak
  - Prompts for Neon connection string (keeps it out of shell history)
  - Runs pg_restore with --no-owner --no-acl to Neon

Security notes:
  - This script does not persist Neon credentials anywhere.
  - Do NOT commit the dump file or paste credentials into public logs.
#>

Set-StrictMode -Version Latest

function ExitWith($msg, $code = 1) {
    Write-Host "ERROR: $msg" -ForegroundColor Red
    exit $code
}

Write-Host "=== Halehame: Export local Postgres -> Restore to Neon ===" -ForegroundColor Cyan

# 1) Find local DATABASE_URL from backend/.env if possible
$envFile = Join-Path -Path (Resolve-Path .\backend).Path -ChildPath '.env'
$localDb = $null
if (Test-Path $envFile) {
    try {
        $content = Get-Content $envFile -ErrorAction Stop | Where-Object { $_ -match '^\s*DATABASE_URL\s*=\s*' }
        if ($content) {
            $localDb = ($content -split '=' , 2)[1].Trim()
            if ($localDb -eq '') { $localDb = $null }
        }
    } catch {
        # ignore
    }
}

if (-not $localDb) {
    $localDb = Read-Host -Prompt "Local DATABASE_URL (e.g. postgresql://user:pass@localhost:5432/halehame)"
}

if (-not $localDb) { ExitWith "No local DATABASE_URL provided" }

Write-Host "Local DB: $localDb" -ForegroundColor Yellow

# 2) Ensure pg_dump and pg_restore available
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
$psql = Get-Command psql -ErrorAction SilentlyContinue

if (-not $pgDump) {
    ExitWith "pg_dump not found on PATH. Install PostgreSQL client tools first (Chocolatey: 'choco install postgresql' or install from https://www.postgresql.org/download/)."
}
if (-not $pgRestore) {
    ExitWith "pg_restore not found on PATH. Install PostgreSQL client tools first."
}

# 3) Create dump file
$dumpFile = Join-Path (Resolve-Path .).Path 'local_dump.bak'
if (Test-Path $dumpFile) {
    Write-Host "Found existing dump file local_dump.bak. Overwrite? (y/N)" -NoNewline
    $ans = Read-Host
    if ($ans -notin @('y','Y')) { ExitWith "Aborted by user" }
    Remove-Item $dumpFile -Force
}

Write-Host "Running pg_dump -> $dumpFile" -ForegroundColor Green
& pg_dump -Fc -v -d $localDb --schema=public -f $dumpFile
if ($LASTEXITCODE -ne 0) { ExitWith "pg_dump failed (exit $LASTEXITCODE)" }

Write-Host "Dump created: $dumpFile" -ForegroundColor Green

# 4) Ask for Neon connection string (masked input)
Write-Host "Provide Neon connection string (postgresql://user:pass@host:port/dbname?sslmode=require)" -ForegroundColor Cyan
$secureNeon = Read-Host -AsSecureString -Prompt "Neon connection string (input is hidden)"
$neonConn = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureNeon))

if (-not $neonConn) { ExitWith "No Neon connection string provided" }

# 5) Attempt pg_restore
Write-Host "Restoring to Neon (this may take a while)..." -ForegroundColor Green
& pg_restore -d $neonConn -v --no-owner --no-acl $dumpFile
$rc = $LASTEXITCODE

if ($rc -eq 0) {
    Write-Host "pg_restore completed successfully." -ForegroundColor Green
} else {
    Write-Host "pg_restore failed with exit code $rc" -ForegroundColor Red

    # Detect common cause: database does not exist
    Write-Host "Checking if database creation is required..." -ForegroundColor Yellow
    # Try to parse dbname from connection string
    try {
        $uri = [System.Uri]::new($neonConn -replace '^postgresql', 'postgres')
        $dbName = $uri.AbsolutePath.TrimStart('/')
    } catch {
        $dbName = $null
    }

    if ($dbName) {
        Write-Host "Target DB name appears to be: $dbName" -ForegroundColor Yellow
        if (-not $psql) {
            Write-Host "psql not found on PATH — cannot create database automatically. Install psql or create the database in Neon Console and re-run this script." -ForegroundColor Red
            ExitWith "pg_restore failed and psql not available for auto-create"
        }

        # Attempt to create the DB then retry restore
        Write-Host "Attempting to create database '$dbName' in Neon using psql..." -ForegroundColor Cyan
        # Build a connection string to the 'postgres' maintenance DB
        if ($neonConn -match '\/([^\?]+)(\?|$)') {
            $maintenanceConn = $neonConn -replace "\/" + $matches[1], "/postgres"
        } else {
            $maintenanceConn = $neonConn
        }

        & psql $maintenanceConn -c "CREATE DATABASE \"$dbName\";"
        if ($LASTEXITCODE -ne 0) { ExitWith "Failed to create database '$dbName' on Neon (psql exit $LASTEXITCODE)" }

        Write-Host "Retrying pg_restore..." -ForegroundColor Green
        & pg_restore -d $neonConn -v --no-owner --no-acl $dumpFile
        if ($LASTEXITCODE -ne 0) { ExitWith "pg_restore retry failed (exit $LASTEXITCODE)" }
        Write-Host "pg_restore completed successfully on retry." -ForegroundColor Green
    } else {
        ExitWith "pg_restore failed and target DB name could not be parsed. Inspect pg_restore output above." 2
    }
}

# 6) Optional verification using psql
if ($psql) {
    Write-Host "Running quick verification queries (users count, tables list)..." -ForegroundColor Cyan
    & psql $neonConn -c "SELECT 'users_count:' as name, COUNT(*) FROM users;" || Write-Host "Warning: query failed — maybe users table missing" -ForegroundColor Yellow
    & psql $neonConn -c "\dt" || Write-Host "Warning: could not list tables" -ForegroundColor Yellow
} else {
    Write-Host "psql not found — cannot run verification queries. Use a GUI or psql to verify the data manually." -ForegroundColor Yellow
}

Write-Host "All done. Remember to update your production DATABASE_URL to the Neon pooled endpoint and redeploy the backend." -ForegroundColor Green
