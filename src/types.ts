export interface Env {
  SESSIONS_DO: DurableObjectNamespace;
  DISABLE_HOMEPAGE?: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  USE_TURNSTILE_TEST_KEYS?: string;
  BASE_PUBLIC_URL: string;
  DEFAULT_TIMEOUT_SECONDS: string;
  MIN_TIMEOUT_SECONDS: string;
  MAX_TIMEOUT_SECONDS: string;
  CLEANUP_DELAY_SECONDS: string;
  CLIENT_SERVER_TOKEN_MAP: string;
}

export type SessionStatus = "pending" | "verified" | "failed" | "expired";

export interface BrandingConfig {
  color?: string;
  favicon?: string;
  name?: string;
  title?: string;
  prompt?: string;
  button_text?: string;
  success_title?: string;
  success_message?: string;
  back_text?: string;
  back_delay_seconds?: number;
  success_color?: string;
}

export interface SessionRecord {
  pollSessionId: string;
  browserSessionId: string;
  clientId: string;
  status: SessionStatus;
  createdAt: number;
  expiresAt: number;
  cleanupAt: number;
  verifiedAt?: number;
  turnstileTokenHash?: string;
  branding: BrandingConfig;
}

export interface CreateSessionBody {
  client_id?: string;
  server_token?: string;
  timeout_seconds?: number;
  branding?: BrandingConfig;
}

export interface ClientTokenPolicy {
  required: boolean;
  token: string;
}

export type ClientTokenPolicyMap = Record<string, ClientTokenPolicy>;
