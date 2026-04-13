param(
  [string]$BaseUrl = "http://localhost:8787",
  [string]$ClientId = "tenant-edu-001"
)

$ErrorActionPreference = "Stop"

function Print-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Print-Pass([string]$Message) {
  Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Print-Fail([string]$Message) {
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

try {
  Print-Step "1) Create session"
  $createBody = @{
    client_id = $ClientId
    timeout_seconds = 120
    branding = @{
      color = "#1C5FAA"
      title = "Local Verification"
      prompt = "Please verify in local environment"
      button_text = "Verify"
      name = "TurnstileAaS"
    }
  } | ConvertTo-Json -Depth 5

  $createResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/sessions" -ContentType "application/json" -Body $createBody
  if (-not $createResp.poll_session_id -or -not $createResp.browser_session_id) {
    throw "Create session did not return both session IDs."
  }
  Print-Pass "Created session. poll_session_id=$($createResp.poll_session_id)"

  Print-Step "2) Verify 404 precedence for unknown session"
  try {
    Invoke-WebRequest -Method Get -Uri "$BaseUrl/api/v1/sessions/poll_not_exist/status?client_id=$ClientId" -UseBasicParsing | Out-Null
    throw "Expected 404 but request succeeded."
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -ne 404) {
      throw "Expected 404 for unknown session, got $status"
    }
    Print-Pass "Unknown session returns 404"
  }

  Print-Step "3) Verify 403 for existing session with wrong client_id"
  try {
    Invoke-WebRequest -Method Get -Uri "$BaseUrl/api/v1/sessions/$($createResp.poll_session_id)/status?client_id=wrong-client" -UseBasicParsing | Out-Null
    throw "Expected 403 but request succeeded."
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -ne 403) {
      throw "Expected 403 for mismatched client_id, got $status"
    }
    Print-Pass "Mismatched client_id returns 403"
  }

  Print-Step "4) Poll status with correct client_id"
  $statusResp = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/sessions/$($createResp.poll_session_id)/status?client_id=$ClientId"
  if (-not $statusResp.status) {
    throw "Status response missing status field."
  }
  Print-Pass "Status endpoint works. status=$($statusResp.status)"

  Print-Step "5) Print public Turnstile URL"
  Write-Host "$($createResp.turnstile_public_url)" -ForegroundColor Yellow

  Print-Pass "Local test script completed."
  exit 0
} catch {
  Print-Fail $_
  exit 1
}
