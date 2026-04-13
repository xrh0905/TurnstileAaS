export type SupportedLocale = "zh-cn" | "en";

export interface I18nMessages {
  home: {
    pageTitle: string;
    heading: string;
    introHtml: string;
    demoButton: string;
    outputLabel: string;
    outputReady: string;
    creatingSession: string;
    demoFailed: string;
    missingPublicUrl: string;
    openedInNewTab: string;
    networkError: string;
    toastVerified: string;
    toastExpired: string;
    statusSync: string;
    reasonReturned: string;
    reasonVerified: string;
    demoBrandingTitle: string;
    demoPromptPrefixHtml: string;
    demoPromptExpireLabel: string;
    demoButtonText: string;
    demoSuccessTitle: string;
    demoSuccessMessage: string;
    demoBackText: string;
  };
  state: {
    back: string;
    autoReturning: string;
    invalidTitle: string;
    invalidMessage: string;
    verifiedTitle: string;
    verifiedMessage: string;
    expiredTitle: string;
    expiredMessage: string;
    unavailableTitle: string;
    unavailableMessage: string;
  };
  turnstile: {
    fallbackPrompt: string;
    buttonText: string;
    successTitle: string;
    successMessage: string;
    backText: string;
    returningIn: string;
    invalidExpiryTime: string;
    expiresAt: string;
    timeLeft: string;
    completeChallengeFirst: string;
    verifying: string;
    verifyFailedRetry: string;
    networkErrorRetry: string;
  };
}

const MESSAGES: Record<SupportedLocale, I18nMessages> = {
  "zh-cn": {
    home: {
      pageTitle: "Turnstile AaS 首页",
      heading: "Turnstile 验证网关",
      introHtml: "点击下方按钮会创建演示会话（<b>frontpage-demo</b>），并在新标签页直接打开 public_url。",
      demoButton: "运行演示",
      outputLabel: "演示输出",
      outputReady: "就绪。",
      creatingSession: "正在创建会话...",
      demoFailed: "演示失败: ",
      missingPublicUrl: "未返回 public_url，请检查后端响应。",
      openedInNewTab: "已在新标签页打开验证页面。完成后回到此页会自动提示结果。",
      networkError: "网络异常: ",
      toastVerified: "验证已完成，欢迎回来。",
      toastExpired: "演示会话已过期，请重新发起。",
      statusSync: "状态同步",
      reasonReturned: "已返回",
      reasonVerified: "验证成功",
      demoBrandingTitle: "首页演示验证",
      demoPromptPrefixHtml: "<p>请完成验证后返回首页。</p>",
      demoPromptExpireLabel: "将过期",
      demoButtonText: "立即验证",
      demoSuccessTitle: "验证成功",
      demoSuccessMessage: "页面即将返回",
      demoBackText: "返回首页"
    },
    state: {
      back: "返回",
      autoReturning: "即将自动返回",
      invalidTitle: "会话无效",
      invalidMessage: "该验证会话无效或已不可用。",
      verifiedTitle: "已完成验证",
      verifiedMessage: "该会话已经验证通过。",
      expiredTitle: "会话已过期",
      expiredMessage: "该会话已过期，请重新发起验证请求。",
      unavailableTitle: "会话不可用",
      unavailableMessage: "该会话当前不可用于验证。"
    },
    turnstile: {
      fallbackPrompt: "请完成验证后继续。",
      buttonText: "验证",
      successTitle: "验证成功",
      successMessage: "验证已完成",
      backText: "返回",
      returningIn: "即将返回",
      invalidExpiryTime: "会话过期时间无效。",
      expiresAt: "会话过期时间：",
      timeLeft: "剩余",
      completeChallengeFirst: "请先完成 Turnstile 挑战。",
      verifying: "验证中...",
      verifyFailedRetry: "验证未通过，请刷新后重试。",
      networkErrorRetry: "网络异常，请刷新后重试。"
    }
  },
  en: {
    home: {
      pageTitle: "Turnstile AaS Home",
      heading: "Turnstile Verification Gateway",
      introHtml: "Click the button below to create a demo session (<b>frontpage-demo</b>) and open the public_url in a new tab.",
      demoButton: "Run Demo",
      outputLabel: "Demo Output",
      outputReady: "Ready.",
      creatingSession: "Creating session...",
      demoFailed: "Demo failed: ",
      missingPublicUrl: "public_url missing in response.",
      openedInNewTab: "Opened verification in a new tab. Return here to see the result toast.",
      networkError: "Network error: ",
      toastVerified: "Verification completed, welcome back.",
      toastExpired: "The demo session has expired. Please start again.",
      statusSync: "status-sync",
      reasonReturned: "returned",
      reasonVerified: "verified",
      demoBrandingTitle: "Homepage Demo Verification",
      demoPromptPrefixHtml: "<p>Please complete verification and return to home page.</p>",
      demoPromptExpireLabel: "Expires in",
      demoButtonText: "Verify Now",
      demoSuccessTitle: "Verified",
      demoSuccessMessage: "Returning shortly",
      demoBackText: "Back to Home"
    },
    state: {
      back: "Back",
      autoReturning: "Auto returning",
      invalidTitle: "Invalid Session",
      invalidMessage: "This verification session is invalid or no longer available.",
      verifiedTitle: "Already Verified",
      verifiedMessage: "This session has already been verified.",
      expiredTitle: "Session Expired",
      expiredMessage: "This session has expired. Please start a new verification request.",
      unavailableTitle: "Session Unavailable",
      unavailableMessage: "This session is not available for verification."
    },
    turnstile: {
      fallbackPrompt: "Please complete verification to continue.",
      buttonText: "Verify",
      successTitle: "Verified",
      successMessage: "Verification complete",
      backText: "Back",
      returningIn: "Returning in",
      invalidExpiryTime: "Invalid session expiry time.",
      expiresAt: "Session expires at: ",
      timeLeft: "left",
      completeChallengeFirst: "Please complete the Turnstile challenge first.",
      verifying: "Verifying...",
      verifyFailedRetry: "Verification failed, please refresh and retry.",
      networkErrorRetry: "Network error, please refresh and retry."
    }
  }
};

export function normalizeLocale(raw?: string | null): SupportedLocale {
  const value = (raw || "").trim().toLowerCase();
  if (value.startsWith("zh")) {
    return "zh-cn";
  }
  return "en";
}

export function resolveLocaleFromRequest(request: Request): SupportedLocale {
  const url = new URL(request.url);
  const fromQuery = normalizeLocale(url.searchParams.get("lang"));
  if (url.searchParams.has("lang")) {
    return fromQuery;
  }
  return normalizeLocale(request.headers.get("accept-language"));
}

export function getI18n(locale: SupportedLocale): I18nMessages {
  return MESSAGES[locale] ?? MESSAGES.en;
}
