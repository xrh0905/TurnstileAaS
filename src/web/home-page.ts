import { getI18n, SupportedLocale } from "./i18n";
import { renderHtmlDocument } from "./page-shell";

export const HOMEPAGE_GITHUB_URL = "https://github.com/xrh0905/TurnstileAaS";

export function renderHomePage(locale: SupportedLocale = "en"): string {
  const i18n = getI18n(locale);

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
    .toast {
      position: fixed;
      right: 20px;
      bottom: 20px;
      max-width: min(440px, calc(100vw - 40px));
      background: #10213ecc;
      color: #fff;
      border: 1px solid #2f4f83;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 18px 40px rgba(12, 24, 46, 0.28);
      opacity: 0;
      transform: translateY(10px);
      pointer-events: none;
      transition: opacity 200ms ease, transform 200ms ease;
      z-index: 30;
      white-space: pre-wrap;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
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
    <h1>${i18n.home.heading}</h1>
    <p>${i18n.home.introHtml}</p>
    <div class="actions">
      <button id="demoBtn">${i18n.home.demoButton}</button>
      <a class="btn secondary" href="${HOMEPAGE_GITHUB_URL}" target="_blank" rel="noreferrer">GitHub</a>
    </div>
    <div class="label">${i18n.home.outputLabel}</div>
    <div class="output" id="outputBox">${i18n.home.outputReady}</div>
  </main>
  <div class="toast" id="toastBox"></div>`;

  const script = `
    const out = document.getElementById("outputBox");
    const btn = document.getElementById("demoBtn");
    const toast = document.getElementById("toastBox");
    const locale = ${JSON.stringify(locale)};
    const i18n = ${JSON.stringify(i18n)};
    const STORAGE_KEY = "turnstile-aas-home-pending";

    function showToast(message) {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 2600);
    }

    function readPending() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    function writePending(list) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-8)));
    }

    function addPending(item) {
      const list = readPending();
      list.push(item);
      writePending(list);
    }

    function removePendingByPollId(pollId) {
      const list = readPending().filter((v) => v && v.poll_session_id !== pollId);
      writePending(list);
    }

    async function checkPendingStatuses(reason) {
      const list = readPending();
      if (!list.length) return;

      for (const item of list) {
        if (!item || !item.poll_session_id || !item.client_id) continue;
        try {
          const resp = await fetch(
            "/api/v1/sessions/" + encodeURIComponent(item.poll_session_id) + "/status",
            { headers: { "x-client-id": item.client_id } }
          );
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) continue;

          if (data.status === "verified") {
            removePendingByPollId(item.poll_session_id);
            showToast(i18n.home.toastVerified + (reason ? " (" + reason + ")" : ""));
          } else if (data.status === "expired") {
            removePendingByPollId(item.poll_session_id);
            showToast(i18n.home.toastExpired);
          }
        } catch {
          // keep quiet for transient network issues
        }
      }
    }

    async function runDemo() {
      btn.disabled = true;
      out.textContent = i18n.home.creatingSession;
      try {
        const timeoutSeconds = 120;
        const payload = {
          client_id: "frontpage-demo",
          timeout_seconds: timeoutSeconds,
          branding: {
            color: "#1C5FAA",
            title: i18n.home.demoBrandingTitle,
            prompt: i18n.home.demoPromptPrefixHtml + "<p><b>" + i18n.home.demoPromptExpireLabel + ": " + timeoutSeconds + "sec</b></p>",
            button_text: i18n.home.demoButtonText,
            success_title: i18n.home.demoSuccessTitle,
            success_message: i18n.home.demoSuccessMessage,
            back_text: i18n.home.demoBackText
          }
        };

        const resp = await fetch("/api/v1/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          out.textContent = i18n.home.demoFailed + JSON.stringify(data, null, 2);
          btn.disabled = false;
          return;
        }

        out.textContent = JSON.stringify(data, null, 2);
        if (data.poll_session_id && data.browser_session_id) {
          addPending({
            poll_session_id: data.poll_session_id,
            browser_session_id: data.browser_session_id,
            client_id: "frontpage-demo",
            created_at: Date.now()
          });
        }

        const target = typeof data.turnstile_public_url === "string" ? data.turnstile_public_url : "";
        if (!target) {
          showToast(i18n.home.missingPublicUrl);
          btn.disabled = false;
          return;
        }

        const withLang = target + (target.includes("?") ? "&" : "?") + "lang=" + encodeURIComponent(locale);
        const opened = window.open(withLang, "_blank");
        if (!opened) {
          window.location.href = withLang;
          return;
        }
        showToast(i18n.home.openedInNewTab);
      } catch (e) {
        out.textContent = i18n.home.networkError + (e && e.message ? e.message : String(e));
      }
      btn.disabled = false;
    }

    window.addEventListener("focus", () => {
      checkPendingStatuses(i18n.home.reasonReturned);
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        checkPendingStatuses(i18n.home.reasonReturned);
      }
    });

    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data && data.source === "turnstile-aas" && data.event === "verified") {
        checkPendingStatuses(i18n.home.reasonVerified);
      }
    });

    checkPendingStatuses(i18n.home.statusSync);
    btn.addEventListener("click", runDemo);
  `;

  return renderHtmlDocument({
    pageTitle: i18n.home.pageTitle,
    style,
    body,
    script,
    htmlLang: locale === "zh-cn" ? "zh-CN" : "en"
  });
}
