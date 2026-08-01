# Import a pg_dump SQL file into Neon (or any remote Postgres).
# Usage:
#   $env:NEON_DATABASE_URL = "postgresql://user:pass@host/db?sslmode=require"
#   .\import-to-neon.ps1
# Optional: pass backup file path as first argument.

$ErrorActionPreference = "Stop"
$backup = if ($args[0]) { $args[0] } else { Join-Path $PSScriptRoot "restaurantos-dev-backup.sql" }

if (-not $env:NEON_DATABASE_URL) {
  Write-Error "Set NEON_DATABASE_URL first."
}

# Neon: use the DIRECT connection (no -pooler) for imports/migrations.
# Example: ep-xxx.c-5.us-east-2.aws.neon.tech (not ep-xxx-pooler....)
if ($env:NEON_DATABASE_URL -match "-pooler") {
  Write-Warning "NEON_DATABASE_URL uses the pooler host. Switch to the direct connection URL from Neon Console for imports."
}

if (-not (Test-Path $backup)) {
  Write-Error "Backup not found: $backup`nRun .\export-local-db.ps1 first."
}

Write-Host "Importing $backup into Neon..."
Write-Host "This replaces existing cloud data."

Get-Content $backup -Raw | docker run --rm -i postgres:16-alpine psql "$env:NEON_DATABASE_URL"

Write-Host "Done. On Render, use Start Command: npm run start:cloud"
Write-Host "(skips demo seed so your imported data is kept)"
