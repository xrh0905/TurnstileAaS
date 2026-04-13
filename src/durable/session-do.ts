import {
  BrandingConfig,
  ClientTokenPolicyMap,
  CreateSessionBody,
  Env,
  SessionRecord,
  SessionStatus
} from "../types";
import { json, normalizeBranding, randomId, sha256Hex, toIso } from "../utils";

const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

function useTurnstileTestKeys(env: Env): boolean {
  return (env.USE_TURNSTILE_TEST_KEYS || "").trim().toLowerCase() === "true";
}

interface CreateSessionResult {
  poll_session_id: string;
  browser_session_id: string;
  expires_at: string;
  expires_in_seconds: number;
}

export class SessionsDurableObject {
  private readonly ctx: DurableObjectState;
  private readonly env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/internal/create") {
      return this.handleCreate(request);
    }

    if (request.method === "GET" && url.pathname.startsWith("/internal/poll/")) {
      const pollId = url.pathname.slice("/internal/poll/".length);
      return this.handlePoll(pollId);
    }

    if (request.method === "GET" && url.pathname.startsWith("/internal/browser/")) {
      const browserId = url.pathname.slice("/internal/browser/".length);
      return this.handleGetByBrowser(browserId);
    }

    if (request.method === "POST" && url.pathname.startsWith("/internal/verify/")) {
      const browserId = url.pathname.slice("/internal/verify/".length);
      return this.handleVerify(browserId, request);
    }

    return json({ error: "not_found" }, { status: 404 });
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const allSessions = await this.ctx.storage.list<SessionRecord>({ prefix: "s:" });

    for (const [key, session] of allSessions) {
      if (session.status === "pending" && now >= session.expiresAt) {
        session.status = "expired";
        await this.ctx.storage.put(key, session);
      }

      if (now >= session.cleanupAt) {
        await this.ctx.storage.delete(key);
        await this.ctx.storage.delete(`b:${session.browserSessionId}`);
      }
    }

    await this.scheduleNextAlarm();
  }

  private async handleCreate(request: Request): Promise<Response> {
    const payload = await request.json<CreateSessionBody>().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return json({ error: "invalid_json" }, { status: 400 });
    }

    const timeoutSeconds = this.normalizeTimeout(payload.timeout_seconds);
    if (!timeoutSeconds) {
      return json({ error: "invalid_timeout_seconds" }, { status: 400 });
    }

    const clientId = typeof payload.client_id === "string" ? payload.client_id.trim() : "";
    if (!clientId) {
      return json({ error: "client_id_required" }, { status: 400 });
    }

    const policyError = this.validateClientServerTokenPolicy(clientId, payload.server_token);
    if (policyError) {
      return policyError;
    }

    const pollSessionId = randomId("poll");
    const browserSessionId = randomId("browser");
    const now = Date.now();
    const expiresAt = now + timeoutSeconds * 1000;
    const cleanupAt = expiresAt + this.getCleanupDelayMs();

    const record: SessionRecord = {
      pollSessionId,
      browserSessionId,
      clientId,
      status: "pending",
      createdAt: now,
      expiresAt,
      cleanupAt,
      branding: normalizeBranding(payload.branding)
    };

    await this.ctx.storage.put(`s:${pollSessionId}`, record);
    await this.ctx.storage.put(`b:${browserSessionId}`, pollSessionId);
    await this.scheduleNextAlarm();

    const result: CreateSessionResult = {
      poll_session_id: pollSessionId,
      browser_session_id: browserSessionId,
      expires_at: toIso(expiresAt),
      expires_in_seconds: timeoutSeconds
    };

    return json(result, { status: 201 });
  }

  private async handlePoll(pollId: string): Promise<Response> {
    if (!pollId) {
      return json({ error: "session_not_found" }, { status: 404 });
    }

    const session = await this.getSessionByPollId(pollId);
    if (!session) {
      return json({ error: "session_not_found" }, { status: 404 });
    }

    this.updateStatusForCurrentTime(session);

    const now = Date.now();
    const effectiveExpiry = session.status === "verified" ? session.cleanupAt : session.expiresAt;
    return json({
      poll_session_id: session.pollSessionId,
      browser_session_id: session.browserSessionId,
      client_id: session.clientId,
      status: session.status,
      verified_at: session.verifiedAt ? toIso(session.verifiedAt) : null,
      expires_at: toIso(effectiveExpiry),
      expires_in_seconds: Math.max(0, Math.floor((effectiveExpiry - now) / 1000))
    });
  }

  private async handleGetByBrowser(browserId: string): Promise<Response> {
    const session = await this.getSessionByBrowserId(browserId);
    if (!session) {
      return json({ error: "session_not_found" }, { status: 404 });
    }

    this.updateStatusForCurrentTime(session);
    return json({
      poll_session_id: session.pollSessionId,
      browser_session_id: session.browserSessionId,
      client_id: session.clientId,
      status: session.status,
      branding: session.branding,
      expires_at: toIso(session.expiresAt)
    });
  }

  private async handleVerify(browserId: string, request: Request): Promise<Response> {
    const session = await this.getSessionByBrowserId(browserId);
    if (!session) {
      return json({ error: "session_not_found" }, { status: 404 });
    }

    this.updateStatusForCurrentTime(session);
    if (session.status !== "pending") {
      return json({ error: "session_not_pending", status: session.status }, { status: 409 });
    }

    const body = await request.json<{ turnstile_token?: string }>().catch(() => null);
    const turnstileToken = typeof body?.turnstile_token === "string" ? body.turnstile_token.trim() : "";
    if (!turnstileToken) {
      return json({ error: "turnstile_token_required" }, { status: 400 });
    }

    const verifyResult = await this.verifyTurnstile(turnstileToken, request.headers.get("cf-connecting-ip"));
    if (!verifyResult.success) {
      session.status = "failed";
      await this.putSession(session);
      return json({ error: "turnstile_verification_failed", details: verifyResult }, { status: 400 });
    }

    session.status = "verified";
    session.verifiedAt = Date.now();
    session.turnstileTokenHash = await sha256Hex(turnstileToken);
    await this.putSession(session);

    return json({ status: "verified", poll_session_id: session.pollSessionId });
  }

  private normalizeTimeout(timeoutSeconds: unknown): number | null {
    const defaultTimeout = this.getIntVar("DEFAULT_TIMEOUT_SECONDS", 300);
    const min = this.getIntVar("MIN_TIMEOUT_SECONDS", 60);
    const max = this.getIntVar("MAX_TIMEOUT_SECONDS", 1800);

    if (timeoutSeconds === undefined) {
      return defaultTimeout;
    }
    if (typeof timeoutSeconds !== "number" || !Number.isFinite(timeoutSeconds)) {
      return null;
    }

    const value = Math.floor(timeoutSeconds);
    if (value < min || value > max) {
      return null;
    }
    return value;
  }

  private validateClientServerTokenPolicy(clientId: string, serverToken: unknown): Response | null {
    const policies = this.parsePolicyMap();
    const policy = policies[clientId];
    if (!policy) {
      return null;
    }

    const provided = typeof serverToken === "string" ? serverToken : "";

    if (policy.required && !provided) {
      return json({ error: "server_token_required" }, { status: 401 });
    }

    if (provided && provided !== policy.token) {
      return json({ error: "server_token_invalid" }, { status: 403 });
    }

    return null;
  }

  private parsePolicyMap(): ClientTokenPolicyMap {
    try {
      const parsed = JSON.parse(this.env.CLIENT_SERVER_TOKEN_MAP || "{}");
      if (parsed && typeof parsed === "object") {
        return parsed as ClientTokenPolicyMap;
      }
      return {};
    } catch {
      return {};
    }
  }

  private async getSessionByPollId(pollId: string): Promise<SessionRecord | null> {
    const session = await this.ctx.storage.get<SessionRecord>(`s:${pollId}`);
    return session ?? null;
  }

  private async getSessionByBrowserId(browserId: string): Promise<SessionRecord | null> {
    const pollId = await this.ctx.storage.get<string>(`b:${browserId}`);
    if (!pollId) {
      return null;
    }
    return this.getSessionByPollId(pollId);
  }

  private updateStatusForCurrentTime(session: SessionRecord): void {
    // Verified sessions must never transition at timeout; they live until cleanupAt.
    if (session.status === "pending" && Date.now() >= session.expiresAt) {
      session.status = "expired";
    }
  }

  private async putSession(session: SessionRecord): Promise<void> {
    this.updateStatusForCurrentTime(session);
    await this.ctx.storage.put(`s:${session.pollSessionId}`, session);
    await this.scheduleNextAlarm();
  }

  private async scheduleNextAlarm(): Promise<void> {
    const allSessions = await this.ctx.storage.list<SessionRecord>({ prefix: "s:" });
    let nextAt: number | null = null;

    for (const session of allSessions.values()) {
      const candidateA = session.expiresAt;
      const candidateB = session.cleanupAt;
      if (candidateA > Date.now() && (nextAt === null || candidateA < nextAt)) {
        nextAt = candidateA;
      }
      if (candidateB > Date.now() && (nextAt === null || candidateB < nextAt)) {
        nextAt = candidateB;
      }
    }

    if (nextAt !== null) {
      await this.ctx.storage.setAlarm(nextAt);
    }
  }

  private getCleanupDelayMs(): number {
    return this.getIntVar("CLEANUP_DELAY_SECONDS", 600) * 1000;
  }

  private getIntVar(name: keyof Env, fallback: number): number {
    const raw = this.env[name];
    const n = Number.parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  private async verifyTurnstile(token: string, remoteIp: string | null): Promise<{ success: boolean; [k: string]: unknown }> {
    const secret = useTurnstileTestKeys(this.env)
      ? TURNSTILE_TEST_SECRET_KEY
      : this.env.TURNSTILE_SECRET_KEY?.trim();
    if (!secret) {
      return {
        success: false,
        error_codes: ["turnstile_secret_key_missing"]
      };
    }

    const form = new FormData();
    form.set("secret", secret);
    form.set("response", token);
    if (remoteIp) {
      form.set("remoteip", remoteIp);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form
    });

    const raw = await response.json().catch(() => ({ success: false, "error-codes": ["invalid-json"] }));
    const payloadObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const errorCodes = Array.isArray(payloadObj["error-codes"])
      ? payloadObj["error-codes"].filter((v): v is string => typeof v === "string")
      : [];

    return {
      success: Boolean(payloadObj.success),
      challenge_ts: typeof payloadObj.challenge_ts === "string" ? payloadObj.challenge_ts : undefined,
      hostname: typeof payloadObj.hostname === "string" ? payloadObj.hostname : undefined,
      error_codes: errorCodes
    };
  }
}
