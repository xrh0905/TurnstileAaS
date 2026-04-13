import { BrandingConfig } from "../types";
import { escapeHtml } from "../utils";
import { renderHtmlDocument, resolveBrandingBasics } from "./page-shell";

export function renderStatePage(args: {
  branding: BrandingConfig;
  title: string;
  message: string;
  accentColor?: string;
  actionText?: string;
}): string {
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
    @keyframes rise {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;

  const body = `
  <main class="card">
    <span class="brand">${escapeHtml(basics.productName)}</span>
    <h1>${escapeHtml(args.title)}</h1>
    <p>${escapeHtml(args.message)}</p>
    <button id="backBtn">${escapeHtml(args.actionText ?? "Back")}</button>
  </main>`;

  const script = `
    document.getElementById("backBtn")?.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    });
  `;

  return renderHtmlDocument({
    pageTitle: basics.title,
    favicon: args.branding.favicon,
    style,
    body,
    script
  });
}
