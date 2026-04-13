param(
  [string]$SessionFile = ".local-session.json",
  [string]$BaseUrl,
  [string]$ClientId,
  [string]$PollSessionId
)

$ErrorActionPreference = "Stop"

if (Test-Path $SessionFile) {
  $saved = Get-Content -Raw -Path $SessionFile | ConvertFrom-Json
  if (-not $BaseUrl) { $BaseUrl = [string]$saved.base_url }
  if (-not $ClientId) { $ClientId = [string]$saved.client_id }
  if (-not $PollSessionId) { $PollSessionId = [string]$saved.poll_session_id }
}

if (-not $BaseUrl) { $BaseUrl = "http://localhost:8787" }
if (-not $ClientId -or -not $PollSessionId) {
  throw "Missing client_id or poll_session_id. Provide params or run issue-request first."
}

$url = "$BaseUrl/api/v1/sessions/$PollSessionId/status?client_id=$ClientId"
$response = Invoke-RestMethod -Method Get -Uri $url

Write-Host "Feedback received:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 6
