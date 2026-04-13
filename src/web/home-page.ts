import { renderHtmlDocument } from "./page-shell";

export const HOMEPAGE_GITHUB_URL = "https://github.com/xrh0905/TurnstileAaS";

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
    <h1>Turnstile 验证网关</h1>
    <p>点击下方按钮会创建演示会话（<b>frontpage-demo</b>），并在新标签页直接打开 public_url。</p>
    <div class="actions">
      <button id="demoBtn">运行演示</button>
      <a class="btn secondary" href="${HOMEPAGE_GITHUB_URL}" target="_blank" rel="noreferrer">GitHub</a>
    </div>
    <div class="label">演示输出</div>
    <div class="output" id="outputBox">就绪。</div>
  </main>
  <div class="toast" id="toastBox"></div>`;

  const script = `
    const out = document.getElementById("outputBox");
    const btn = document.getElementById("demoBtn");
    const toast = document.getElementById("toastBox");
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
            showToast("验证已完成，欢迎回来。" + (reason ? "（" + reason + "）" : ""));
          } else if (data.status === "expired") {
            removePendingByPollId(item.poll_session_id);
            showToast("演示会话已过期，请重新发起。" );
          }
        } catch {
          // keep quiet for transient network issues
        }
      }
    }

    async function runDemo() {
      btn.disabled = true;
      out.textContent = "正在创建会话...";
      try {
        const timeoutSeconds = 120;
        const expectedExpireAt = new Date(Date.now() + timeoutSeconds * 1000).toLocaleString("zh-CN", { hour12: false });

        const payload = {
          client_id: "frontpage-demo",
          timeout_seconds: timeoutSeconds,
          branding: {
            color: "#1C5FAA",
            title: "首页演示验证",
            prompt: "<p>请完成验证后返回首页。</p><p><b>动态过期时间（示例）: " + expectedExpireAt + "</b></p>",
            button_text: "立即验证",
            success_title: "验证成功",
            success_message: "页面即将返回",
            back_text: "返回首页"
          }
        };

        const resp = await fetch("/api/v1/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          out.textContent = "演示失败: " + JSON.stringify(data, null, 2);
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
          showToast("未返回 public_url，请检查后端响应。");
          btn.disabled = false;
          return;
        }

        // Open in a regular _blank tab (not popup window).
        const opened = window.open(target, "_blank");
        if (!opened) {
          window.location.href = target;
          return;
        }
        showToast("已在新标签页打开验证页面。完成后回到此页会自动提示结果。");
      } catch (e) {
        out.textContent = "网络异常: " + (e && e.message ? e.message : String(e));
      }
      btn.disabled = false;
    }

    window.addEventListener("focus", () => {
      checkPendingStatuses("已返回");
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        checkPendingStatuses("已返回");
      }
    });

    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data && data.source === "turnstile-aas" && data.event === "verified") {
        checkPendingStatuses("验证成功");
      }
    });

    checkPendingStatuses("状态同步");
    btn.addEventListener("click", runDemo);
  `;

  return renderHtmlDocument({
    pageTitle: "Turnstile AaS Home",
    style,
    body,
    script
  });
}
