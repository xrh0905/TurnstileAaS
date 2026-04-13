import { BrandingConfig } from "../types";
import { escapeHtml } from "../utils";

export function renderTurnstilePage(args: {
  siteKey: string;
  browserSessionId: string;
  verifyEndpoint: string;
  branding: BrandingConfig;
}): string {
  const color = args.branding.color ?? "#1C5FAA";
  const successColor = args.branding.success_color ?? color;
  const title = escapeHtml(args.branding.title ?? "Human Verification");
  const promptHtml = args.branding.prompt ?? escapeHtml("Please complete verification to continue.");
  const buttonText = escapeHtml(args.branding.button_text ?? "Verify");
  const productName = escapeHtml(args.branding.name ?? "Verification");
  const successTitle = escapeHtml(args.branding.success_title ?? "Verified");
  const successMessage = escapeHtml(args.branding.success_message ?? "Confirmation complete");
  const backText = escapeHtml(args.branding.back_text ?? "Back");
  const backDelay = typeof args.branding.back_delay_seconds === "number" ? args.branding.back_delay_seconds : 3;
  const faviconTag = args.branding.favicon
    ? `<link rel=\"icon\" href=\"${escapeHtml(args.branding.favicon)}\" />`
    : "";

  return `<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>${title}</title>
  ${faviconTag}
  <script src=\"https://challenges.cloudflare.com/turnstile/v0/api.js\" async defer></script>
  <style>
    :root {
      --brand: ${color};
      --success: ${successColor};
      --bgA: #f3f9ff;
      --bgB: #e6eef9;
      --text: #1a1f2b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      color: var(--text);
      background: radial-gradient(circle at 10% 20%, var(--bgA), var(--bgB));
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 520px;
      border-radius: 20px;
      background: #ffffffcc;
      border: 1px solid #d7e3f5;
      box-shadow: 0 20px 50px rgba(22, 32, 56, 0.12);
      backdrop-filter: blur(6px);
      padding: 28px;
      animation: rise 450ms ease-out;
    }
    h1 {
      margin: 0;
      font-size: 1.6rem;
      letter-spacing: 0.2px;
    }
    .prompt {
      margin: 12px 0 20px;
      line-height: 1.45;
    }
    .prompt p { margin: 0 0 10px; }
    .prompt p:last-child { margin-bottom: 0; }
    .prompt ul, .prompt ol { margin: 8px 0 12px 20px; padding: 0; }
    .prompt code, .prompt pre {
      background: #eef3fb;
      border-radius: 8px;
      padding: 2px 6px;
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.92em;
    }
    .brand {
      display: inline-block;
      font-size: 0.85rem;
      color: #3f4f6b;
      border: 1px solid #d7e3f5;
      border-radius: 999px;
      padding: 6px 10px;
      margin-bottom: 10px;
      background: #f9fcff;
    }
    .actions {
      margin-top: 18px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    button {
      appearance: none;
      border: 0;
      border-radius: 12px;
      padding: 12px 16px;
      font-weight: 600;
      color: #fff;
      background: var(--brand);
      cursor: pointer;
      transition: transform 120ms ease, opacity 120ms ease;
    }
    button:hover { transform: translateY(-1px); }
    button:disabled { opacity: 0.6; cursor: wait; }
    .status { font-size: 0.9rem; min-height: 1.2rem; }

    .success-screen {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, #f7fbff, #ecf3ff 42%, #dce8ff 100%);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 20;
      padding: 20px;
    }
    .success-screen.visible { display: flex; }
    .success-wrap {
      text-align: center;
      max-width: 440px;
      width: 100%;
      animation: rise 380ms ease-out;
    }
    .tick-shell {
      margin: 0 auto 24px;
      width: 128px;
      height: 128px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 20px 50px rgba(18, 48, 92, 0.18);
      display: grid;
      place-items: center;
      transform: scale(0.9);
      animation: pop 380ms ease-out forwards;
    }
    .tick-svg { width: 88px; height: 88px; }
    .tick-ring {
      fill: none;
      stroke: color-mix(in srgb, var(--success) 18%, white);
      stroke-width: 6;
      stroke-dasharray: 300;
      stroke-dashoffset: 300;
      animation: draw 620ms ease-out forwards;
    }
    .tick-path {
      fill: none;
      stroke: var(--success);
      stroke-width: 8;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 80;
      stroke-dashoffset: 80;
      animation: draw 320ms 520ms ease-out forwards;
    }
    .success-title {
      margin: 0;
      font-size: 2rem;
      letter-spacing: 0.2px;
    }
    .success-message {
      margin: 10px 0 22px;
      color: #3a4868;
      font-size: 1rem;
    }
    .back-btn {
      background: var(--success);
      color: #fff;
      border: 0;
      border-radius: 999px;
      padding: 12px 20px;
      font-weight: 600;
      cursor: pointer;
    }
    .back-meta {
      margin-top: 10px;
      font-size: 0.9rem;
      color: #506082;
      min-height: 1.2rem;
    }
    @keyframes rise {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes pop {
      from { transform: scale(0.86); opacity: 0.5; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes draw {
      to { stroke-dashoffset: 0; }
    }
  </style>
</head>
<body>
  <main class=\"card\">
    <span class=\"brand\">${productName}</span>
    <h1>${title}</h1>
       <div class="prompt">${promptHtml}</div>
    <div class=\"cf-turnstile\" data-sitekey=\"${escapeHtml(args.siteKey)}\" data-theme=\"light\"></div>
    <div class=\"actions\">
      <button id=\"verifyBtn\">${buttonText}</button>
      <span class=\"status\" id=\"statusText\"></span>
    </div>
  </main>

  <section class="success-screen" id="successScreen" aria-live="polite">
    <div class="success-wrap">
      <div class="tick-shell" role="img" aria-label="verified">
        <svg class="tick-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <circle class="tick-ring" cx="60" cy="60" r="44"></circle>
          <path class="tick-path" d="M36 61 l16 16 l32 -34"></path>
        </svg>
      </div>
      <h2 class="success-title">${successTitle}</h2>
      <p class="success-message">${successMessage}</p>
      <button class="back-btn" id="backBtn">${backText}</button>
      <div class="back-meta" id="backMeta"></div>
    </div>
  </section>

  <script>
    const browserSessionId = ${JSON.stringify(args.browserSessionId)};
    const verifyEndpoint = ${JSON.stringify(args.verifyEndpoint)};
    const backDelaySeconds = ${JSON.stringify(backDelay)};

    const verifyBtn = document.getElementById("verifyBtn");
    const statusText = document.getElementById("statusText");
    const successScreen = document.getElementById("successScreen");
    const backBtn = document.getElementById("backBtn");
    const backMeta = document.getElementById("backMeta");

    let backTimer = null;

    function backOrExit() {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      try {
        window.close();
      } catch {}
      setTimeout(() => {
        if (!document.hidden) {
          window.location.href = "about:blank";
        }
      }, 120);
    }

    function showSuccessFullPage() {
      successScreen.classList.add("visible");
      if (backDelaySeconds <= 0) {
        backMeta.textContent = "";
        return;
      }

      let left = backDelaySeconds;
      backMeta.textContent = "Returning in " + left + "s";
      backTimer = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          clearInterval(backTimer);
          backOrExit();
          return;
        }
        backMeta.textContent = "Returning in " + left + "s";
      }, 1000);
    }

    backBtn.addEventListener("click", () => {
      if (backTimer) {
        clearInterval(backTimer);
      }
      backOrExit();
    });

    verifyBtn.addEventListener("click", async () => {
      const token = window.turnstile?.getResponse?.();
      if (!token) {
        statusText.textContent = "Please complete the Turnstile challenge first.";
        return;
      }

      verifyBtn.disabled = true;
      statusText.textContent = "Verifying...";

      try {
        const response = await fetch(verifyEndpoint.replace(":id", browserSessionId), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ turnstile_token: token })
        });

        if (!response.ok) {
          const failed = await response.json().catch(() => ({}));
          statusText.textContent = failed.error || "Verification failed.";
          verifyBtn.disabled = false;
          return;
        }

        showSuccessFullPage();
      } catch {
        statusText.textContent = "Network error. Please retry.";
        verifyBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}
