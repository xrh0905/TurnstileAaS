import { BrandingConfig } from "./types";

function normalizeText(input: unknown, maxLen: number): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, maxLen);
}

function normalizeInt(input: unknown, min: number, max: number): number | undefined {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return undefined;
  }
  const n = Math.floor(input);
  if (n < min || n > max) {
    return undefined;
  }
  return n;
}

export function normalizeBranding(input: unknown): BrandingConfig {
  if (!input || typeof input !== "object") {
    return {};
  }

  const obj = input as Record<string, unknown>;

  return {
    color: normalizeText(obj.color, 32),
    favicon: normalizeText(obj.favicon, 512),
    name: normalizeText(obj.name, 120),
    title: normalizeText(obj.title, 160),
    // Trust-mode rich text: keep client HTML as-is (including iframe).
    prompt: normalizeText(obj.prompt, 10000),
    button_text: normalizeText(obj.button_text, 64),
    success_title: normalizeText(obj.success_title, 120),
    success_message: normalizeText(obj.success_message, 240),
    back_text: normalizeText(obj.back_text, 80),
    back_delay_seconds: normalizeInt(obj.back_delay_seconds, 0, 30),
    success_color: normalizeText(obj.success_color, 32)
  };
}

export function escapeHtml(value: unknown): string {
  const safe = typeof value === "string" ? value : value == null ? "" : String(value);
  return safe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

export function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

export function randomId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return `${prefix}_${out}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}
