# Turnstile as a service (Turnstile AaS)

Cloudflare-native session verification service using Workers, Durable Objects, and Turnstile.

## Features
- Create session with required `client_id`, optional `server_token` policy.
- Returns two IDs: `poll_session_id` and `browser_session_id`.
- Public branded Turnstile page by browser session ID.
- Poll verification status by poll session ID.
- Timeout marks session as `expired`.
- Auto cleanup at `timeout + 10 minutes`.
- 404 precedence: if `session_id` is missing/unknown, return 404 before auth mismatch checks.

## API

### Create Session
`POST /api/v1/sessions`

Example request:

```json
{
   "client_id": "tenant-edu-001",
   "server_token": "optional-server-token",
   "timeout_seconds": 300,
   "branding": {
      "color": "#1C5FAA",
      "favicon": "https://cdn.example.com/favicon.ico",
      "name": "Turnstile Verification",
      "title": "Please Verify",
      "prompt": "Complete the challenge to continue",
      "button_text": "Verify",
      "success_title": "Confirmed",
      "success_message": "You can return to the app now",
      "back_text": "Return",
      "back_delay_seconds": 3,
      "success_color": "#14A44D"
   }
}
```

Example success response:

```json
{
   "poll_session_id": "poll_xxx",
   "browser_session_id": "browser_xxx",
   "expires_at": "2026-04-14T08:00:00.000Z",
   "expires_in_seconds": 300,
   "status_poll_url": "https://your-worker-domain/api/v1/sessions/poll_xxx/status",
   "turnstile_public_url": "https://your-worker-domain/v/browser_xxx"
}
```

### Poll Status
`GET /api/v1/sessions/:poll_session_id/status`

Provide `x-client-id` header (or `client_id` query param).

Status code semantics:
- `404`: `poll_session_id` missing or not found (checked first).
- `403`: session exists but provided `client_id` is missing or mismatched.

### Verify Turnstile
`POST /api/v1/turnstile/:browser_session_id/verify`

Example request:

```json
{
   "turnstile_token": "token-from-turnstile-widget"
}
```

## Session Lifecycle

1. Created as `pending`.
2. If still pending at timeout, it becomes `expired`.
3. If already `verified`, it does not enter timeout status.
4. At cleanup time (`timeout + 10 minutes`), session expires/purges.

## Setup
1. Install dependencies:
   npm install
2. Configure production/deployed secrets:
   wrangler secret put TURNSTILE_SITE_KEY
   wrangler secret put TURNSTILE_SECRET_KEY
3. Optional vars in `wrangler.toml`:
   - `BASE_PUBLIC_URL` (default is `http://localhost:8787` for local)
   - `USE_TURNSTILE_TEST_KEYS` (`true` to explicitly use Cloudflare test keys)
   - `CLIENT_SERVER_TOKEN_MAP`
4. Run locally:
   wrangler dev

## Local Secrets (Fix for local test)
`wrangler secret put` writes remote/deployment secrets. For local `wrangler dev`, use `.dev.vars`.

1. Create local secret file:
   - Copy `.dev.vars.example` to `.dev.vars`
2. Fill real Turnstile keys in `.dev.vars`:
   - `TURNSTILE_SITE_KEY=...`
   - `TURNSTILE_SECRET_KEY=...`
   - Note: no test-key fallback is used; keys must be present.
   - Optional: set `USE_TURNSTILE_TEST_KEYS=true` in `wrangler.toml` to explicitly use test keys.
3. Start local worker:
   - `wrangler dev`

If your local test only checks create/poll APIs (`npm run test:local`), it does not require Turnstile verification call. But to open `/v/:id` and complete verification, `.dev.vars` secrets are required.

## Local Test Script (localhost)
1. Start worker in one terminal:
   wrangler dev
2. Run API checks in another terminal:
   npm run test:local

Use a custom domain/base URL when needed:
- `powershell -File ./scripts/local-test.ps1 -BaseUrl https://verify.example.com -ClientId tenant-edu-001`

The script validates:
- create session returns two IDs;
- unknown session returns 404 first;
- existing session with wrong client returns 403;
- valid poll request succeeds.

## Rich Text Prompt (HTML)
The branding field `prompt` is rendered in trust mode as rich text HTML on the public Turnstile page.

Trust mode behavior:
- client HTML is rendered directly;
- iframe embedding is supported;
- no strict sanitize pipeline is applied.

Success screen behavior:
- after verification, a full-page animated tick screen is shown;
- `back_text` controls the back button label;
- `back_delay_seconds` controls auto return/close delay (default 3);
- `success_title`, `success_message`, `success_color` control success branding.

## Three Local Scripts (as requested)
1. Start server:
   - `npm run local:start`
2. Issue request (create session and save `.local-session.json`):
   - `npm run local:issue`
3. Request feedback (poll status from saved session):
   - `npm run local:feedback`

You can also pass parameters manually:
- `powershell -File ./scripts/issue-request.ps1 -ClientId tenant-edu-001 -TimeoutSeconds 120`
- `powershell -File ./scripts/request-feedback.ps1 -PollSessionId poll_xxx -ClientId tenant-edu-001`

Use custom domain/base URL:
- `powershell -File ./scripts/issue-request.ps1 -BaseUrl https://verify.example.com -ClientId tenant-edu-001`
- `powershell -File ./scripts/request-feedback.ps1 -BaseUrl https://verify.example.com -PollSessionId poll_xxx -ClientId tenant-edu-001`

## Production Deploy (Brief)
1. Login and pick account:
   - `npx wrangler login`
   - `npx wrangler whoami`
2. Set production secrets:
   - `npx wrangler secret put TURNSTILE_SITE_KEY --env production`
   - `npx wrangler secret put TURNSTILE_SECRET_KEY --env production`
3. Update `wrangler.toml` production values:
   - set `[env.production.vars].BASE_PUBLIC_URL` to your HTTPS custom domain.
   - keep `USE_TURNSTILE_TEST_KEYS = "false"` in production.
4. (Optional) Enable custom domain route:
   - uncomment `[[env.production.routes]]` and set your host pattern.
5. Deploy:
   - `npm run deploy:prod`

## CLIENT_SERVER_TOKEN_MAP
JSON object where each client can require optional server token auth.

Example:
{
  "clientA": { "required": true, "token": "s3cr3t" },
  "clientB": { "required": false, "token": "" }
}
