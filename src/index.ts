import { SessionsDurableObject } from "./durable/session-do";
import type { Env } from "./types";
import { json } from "./utils";
import { HOMEPAGE_GITHUB_URL, renderHomePage } from "./web/home-page";
import { renderStatePage, renderTurnstilePage } from "./web/public-page";

const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

function useTurnstileTestKeys(env: Env): boolean {
  return (env.USE_TURNSTILE_TEST_KEYS || "").trim().toLowerCase() === "true";
}

function disableHomepage(env: Env): boolean {
  return (env.DISABLE_HOMEPAGE || "").trim().toLowerCase() === "true";
}

async function proxyToDo(env: Env, method: string, path: string, body?: unknown): Promise<Response> {
  const id = env.SESSIONS_DO.idFromName("global-sessions");
  const stub = env.SESSIONS_DO.get(id);
  const req = new Request(`https://do.local${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return stub.fetch(req);
}

function readClientId(request: Request): string {
  const fromHeader = request.headers.get("x-client-id")?.trim();
  const fromQuery = new URL(request.url).searchParams.get("client_id")?.trim();
  return fromHeader || fromQuery || "";
}

function toPublicBaseUrl(env: Env, request: Request): string {
  const configured = env.BASE_PUBLIC_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      if (disableHomepage(env)) {
        return Response.redirect(HOMEPAGE_GITHUB_URL, 302);
      }
      return new Response(renderHomePage(), {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    if (request.method === "POST" && url.pathname === "/api/v1/sessions") {
      const payload = await request.json().catch(() => null);
      if (!payload || typeof payload !== "object") {
        return json({ error: "invalid_json" }, { status: 400 });
      }

      const doResponse = await proxyToDo(env, "POST", "/internal/create", payload);
      if (!doResponse.ok) {
        return doResponse;
      }

      const data = await doResponse.json<{
        poll_session_id: string;
        browser_session_id: string;
        expires_at: string;
        expires_in_seconds: number;
      }>();

      const base = toPublicBaseUrl(env, request);
      return json({
        poll_session_id: data.poll_session_id,
        browser_session_id: data.browser_session_id,
        expires_at: data.expires_at,
        expires_in_seconds: data.expires_in_seconds,
        status_poll_url: `${base}/api/v1/sessions/${data.poll_session_id}/status`,
        turnstile_public_url: `${base}/v/${data.browser_session_id}`
      }, { status: 201 });
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/v1/sessions/") && url.pathname.endsWith("/status")) {
      const prefix = "/api/v1/sessions/";
      const suffix = "/status";
      const pollSessionId = url.pathname.slice(prefix.length, -suffix.length);

      // Requirement precedence: session missing/unknown must return 404 before auth mismatch checks.
      const doResponse = await proxyToDo(env, "GET", `/internal/poll/${pollSessionId}`);
      if (doResponse.status === 404) {
        return doResponse;
      }
      if (!doResponse.ok) {
        return doResponse;
      }

      const data = await doResponse.json<{
        client_id: string;
      } & Record<string, unknown>>();

      const providedClientId = readClientId(request);
      if (!providedClientId || providedClientId !== String(data.client_id)) {
        return json({ error: "forbidden" }, { status: 403 });
      }

      return json(data);
    }

    if (request.method === "GET" && url.pathname.startsWith("/v/")) {
      const browserSessionId = url.pathname.slice("/v/".length);
      const doResponse = await proxyToDo(env, "GET", `/internal/browser/${browserSessionId}`);
      if (doResponse.status === 404) {
        const html = renderStatePage({
          branding: {},
          title: "Invalid Session",
          message: "This verification session is invalid or no longer available.",
          accentColor: "#E4572E",
          actionText: "Back"
        });
        return new Response(html, {
          status: 404,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store"
          }
        });
      }
      if (!doResponse.ok) {
        return doResponse;
      }

      const data = await doResponse.json<{
        status: string;
        branding: Record<string, string | undefined>;
      }>();

      if (data.status !== "pending") {
        const map: Record<string, { title: string; message: string; color: string }> = {
          verified: {
            title: "Already Verified",
            message: "This session has already been verified.",
            color: "#14A44D"
          },
          expired: {
            title: "Session Expired",
            message: "This session has expired. Please start a new verification request.",
            color: "#E0A100"
          },
          failed: {
            title: "Verification Failed",
            message: "This session is no longer valid for verification.",
            color: "#E4572E"
          }
        };

        const state = map[String(data.status)] || {
          title: "Session Unavailable",
          message: "This session is not available for verification.",
          color: "#5B6B8A"
        };

        const html = renderStatePage({
          branding: (data.branding || {}) as any,
          title: state.title,
          message: state.message,
          accentColor: state.color,
          actionText: "Back"
        });
        return new Response(html, {
          status: 409,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store"
          }
        });
      }

      const siteKey = useTurnstileTestKeys(env)
        ? TURNSTILE_TEST_SITE_KEY
        : env.TURNSTILE_SITE_KEY?.trim();
      if (!siteKey) {
        return json({
          error: "turnstile_site_key_missing",
          message: "TURNSTILE_SITE_KEY is not configured (or set USE_TURNSTILE_TEST_KEYS=true)"
        }, { status: 500 });
      }

      const html = renderTurnstilePage({
        siteKey,
        browserSessionId,
        verifyEndpoint: "/api/v1/turnstile/:id/verify",
        branding: data.branding
      });

      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/v1/turnstile/") && url.pathname.endsWith("/verify")) {
      const prefix = "/api/v1/turnstile/";
      const suffix = "/verify";
      const browserSessionId = url.pathname.slice(prefix.length, -suffix.length);
      return proxyToDo(env, "POST", `/internal/verify/${browserSessionId}`, await request.json().catch(() => null));
    }

    return json({ error: "not_found" }, { status: 404 });
  }
} satisfies ExportedHandler<Env>;

export { SessionsDurableObject };
