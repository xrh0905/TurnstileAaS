param(
  [string]$BaseUrl = "http://localhost:8787",
  [string]$ClientId = "tenant-edu-001",
  [int]$TimeoutSeconds = 120,
  [string]$OutFile = ".local-session.json"
)

$ErrorActionPreference = "Stop"

$body = @{
  client_id = $ClientId
  timeout_seconds = $TimeoutSeconds
  branding = @{
    color = "#1C5FAA"
    title = "Local Verification"
    prompt = "Please verify in local environment"
    button_text = "Verify"
    name = "TurnstileAaS"
  }
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/sessions" -ContentType "application/json" -Body $body

if (-not $response.poll_session_id -or -not $response.browser_session_id) {
  throw "Create session failed: response missing session IDs."
}

$session = @{
  base_url = $BaseUrl
  client_id = $ClientId
  poll_session_id = $response.poll_session_id
  browser_session_id = $response.browser_session_id
  status_poll_url = $response.status_poll_url
  turnstile_public_url = $response.turnstile_public_url
  expires_at = $response.expires_at
} | ConvertTo-Json -Depth 5

Set-Content -Path $OutFile -Value $session -Encoding UTF8

Write-Host "Session created." -ForegroundColor Green
Write-Host "poll_session_id: $($response.poll_session_id)"
Write-Host "browser_session_id: $($response.browser_session_id)"
Write-Host "turnstile_public_url: $($response.turnstile_public_url)"
Write-Host "Saved session file: $OutFile"
