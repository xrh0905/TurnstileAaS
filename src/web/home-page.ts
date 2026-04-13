import { renderHtmlDocument } from "./page-shell";

export const HOMEPAGE_GITHUB_URL = "https://github.com";

export function renderHomePage(): string {
  const style = `
    :root {
      --brand: #1C5FAA;
      --bgA: #f4f9ff;
      --bgB: #e8f0ff;
      --text: #16233a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      color: var(--text);
      background: radial-gradient(circle at 12% 20%, var(--bgA), var(--bgB));
      display: grid;
      place-items: center;
      padding: 20px;
    }
    .card {
      width: min(760px, 100%);
      background: #ffffffd8;
      border: 1px solid #d8e5fb;
      border-radius: 22px;
      box-shadow: 0 22px 55px rgba(24, 46, 84, 0.14);
      backdrop-filter: blur(8px);
      padding: 28px;
      animation: rise 360ms ease-out;
    }
    h1 { margin: 0; font-size: 1.8rem; }
    p { line-height: 1.5; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    button, a.btn {
      border: 0;
      border-radius: 12px;
      background: var(--brand);
      color: #fff;
      font-weight: 600;
      padding: 11px 15px;
      text-decoration: none;
      cursor: pointer;
      display: inline-block;
    }
    .secondary {
      background: #0f172a;
    }
    .output {
      margin-top: 14px;
      border: 1px solid #d8e5fb;
      border-radius: 12px;
      background: #f8fbff;
      padding: 12px;
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.9rem;
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 80px;
    }
    .label {
      margin-top: 12px;
      color: #4d5f86;
      font-size: 0.9rem;
    }
    @keyframes rise {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;

  const body = `
  <main class="card">
    <h1>Turnstile Verification Gateway</h1>
    <p>This homepage provides a quick live demo that creates a verification session with client id <b>frontpage-demo</b>.</p>
    <div class="actions">
      <button id="demoBtn">Run Quick Demo</button>
      <a class="btn secondary" href="${HOMEPAGE_GITHUB_URL}" target="_blank" rel="noreferrer">GitHub</a>
    </div>
    <div class="label">Demo Output</div>
    <div class="output" id="outputBox">Ready.</div>
  </main>`;

  const script = `
    const out = document.getElementById("outputBox");
    const btn = document.getElementById("demoBtn");

    async function runDemo() {
      btn.disabled = true;
      out.textContent = "Creating session...";
      try {
        const payload = {
          client_id: "frontpage-demo",
          timeout_seconds: 120,
          branding: {
            color: "#1C5FAA",
            title: "Frontpage Demo",
            prompt: "Please verify to continue",
            button_text: "Verify"
          }
        };

        const resp = await fetch("/api/v1/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          out.textContent = "Demo failed: " + JSON.stringify(data, null, 2);
          btn.disabled = false;
          return;
        }

        out.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        out.textContent = "Network error: " + (e && e.message ? e.message : String(e));
      }
      btn.disabled = false;
    }

    btn.addEventListener("click", runDemo);
  `;

  return renderHtmlDocument({
    pageTitle: "Turnstile AaS Home",
    style,
    body,
    script
  });
}
