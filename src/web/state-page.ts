import { BrandingConfig } from "../types";
import { escapeHtml } from "../utils";
import { getI18n } from "./i18n";
import { renderHtmlDocument, resolveBrandingBasics } from "./page-shell";

export function renderStatePage(args: {
  branding: BrandingConfig;
  title: string;
  message: string;
  accentColor?: string;
  actionText?: string;
  autoReturnSeconds?: number;
  icon?: "success" | "expired" | "invalid" | "info";
  locale?: "zh-cn" | "en";
}): string {
  const locale = args.locale ?? "en";
  const i18n = getI18n(locale);
  const basics = resolveBrandingBasics(args.branding);
  const color = args.accentColor ?? basics.color;

  const style = `
    :root {
      --brand: ${color};
      --bgA: #f5f9ff;
      --bgB: #eaf1fd;
      --text: #1a2336;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: radial-gradient(circle at 12% 20%, var(--bgA), var(--bgB));
      display: grid;
      place-items: center;
      padding: 20px;
      color: var(--text);
    }
    .card {
      width: 100%;
      max-width: 520px;
      background: #ffffffcc;
      border: 1px solid #dbe6fb;
      border-radius: 20px;
      box-shadow: 0 18px 45px rgba(28, 45, 79, 0.15);
      backdrop-filter: blur(8px);
      padding: 28px;
      animation: rise 360ms ease-out;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 12px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: 32px;
      font-weight: 700;
      color: #fff;
      background: var(--brand);
      box-shadow: 0 10px 28px color-mix(in srgb, var(--brand) 28%, transparent);
    }
    .brand {
      display: inline-block;
      margin-bottom: 10px;
      border-radius: 999px;
      border: 1px solid #dbe6fb;
      background: #f8fbff;
      font-size: 0.83rem;
      color: #455576;
      padding: 6px 10px;
    }
    h1 {
      margin: 0;
      font-size: 1.45rem;
      color: var(--brand);
    }
    p {
      margin: 12px 0 20px;
      line-height: 1.5;
    }
    button {
      appearance: none;
      border: 0;
      border-radius: 12px;
      background: var(--brand);
      color: #fff;
      font-weight: 600;
      padding: 11px 16px;
      cursor: pointer;
    }
    .meta {
      margin-top: 10px;
      font-size: 0.9rem;
      color: #5a6c90;
      min-height: 1.1rem;
    }
    @keyframes rise {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;

  const body = `
  <main class="card">
    <div class="icon" aria-hidden="true">${args.icon === "success" ? "✓" : args.icon === "expired" ? "!" : args.icon === "invalid" ? "×" : "i"}</div>
    <span class="brand">${escapeHtml(basics.productName)}</span>
    <h1>${escapeHtml(args.title)}</h1>
    <p>${escapeHtml(args.message)}</p>
    <button id="backBtn">${escapeHtml(args.actionText ?? i18n.state.back)}</button>
    <div class="meta" id="metaText"></div>
  </main>`;

  const script = `
    const autoReturnSeconds = ${JSON.stringify(typeof args.autoReturnSeconds === "number" ? args.autoReturnSeconds : 0)};
    const metaText = document.getElementById("metaText");

    function backOrExit() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    }

    document.getElementById("backBtn")?.addEventListener("click", backOrExit);

    const locale = ${JSON.stringify(locale)};

    if (autoReturnSeconds > 0) {
      let left = autoReturnSeconds;
      if (metaText) {
        metaText.textContent = locale === "zh-cn"
          ? ${JSON.stringify(i18n.state.autoReturning)} + "（" + left + "s）"
          : ${JSON.stringify(i18n.state.autoReturning)} + " in " + left + "s";
      }
      const timer = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          clearInterval(timer);
          backOrExit();
          return;
        }
        if (metaText) {
          metaText.textContent = locale === "zh-cn"
            ? ${JSON.stringify(i18n.state.autoReturning)} + "（" + left + "s）"
            : ${JSON.stringify(i18n.state.autoReturning)} + " in " + left + "s";
        }
      }, 1000);
    }
  `;

  return renderHtmlDocument({
    pageTitle: basics.title,
    favicon: args.branding.favicon,
    style,
    body,
    script,
    htmlLang: locale === "zh-cn" ? "zh-CN" : "en"
  });
}
