# Export local RestaurantOS PostgreSQL (Docker) to a SQL file.
# Default: restaurantos-db container on port 5433.

$ErrorActionPreference = "Stop"
$container = if ($env:POSTGRES_CONTAINER) { $env:POSTGRES_CONTAINER } else { "restaurantos-db" }
$outFile = if ($args[0]) { $args[0] } else { Join-Path $PSScriptRoot "restaurantos-dev-backup.sql" }

Write-Host "Exporting from container '$container'..."
docker exec $container pg_dump -U restaurantos -d restaurantos --clean --if-exists --no-owner --no-acl -F p -f /tmp/restaurantos-export.sql
docker cp "${container}:/tmp/restaurantos-export.sql" $outFile

$size = (Get-Item $outFile).Length / 1MB
Write-Host "Saved: $outFile ($([math]::Round($size, 2)) MB)"
Write-Host "Next: set NEON_DATABASE_URL and run .\import-to-neon.ps1"
