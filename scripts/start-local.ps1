param()

$ErrorActionPreference = "Stop"

Write-Host "Starting local Cloudflare Worker on http://localhost:8787 ..." -ForegroundColor Cyan
npx wrangler dev
