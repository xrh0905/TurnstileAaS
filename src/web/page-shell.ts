import { BrandingConfig } from "../types";
import { escapeHtml } from "../utils";

export function renderHtmlDocument(args: {
  pageTitle: string;
  favicon?: string;
  style: string;
  body: string;
  script?: string;
  headExtra?: string;
}): string {
  const faviconTag = args.favicon
    ? `<link rel="icon" href="${escapeHtml(args.favicon)}" />`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(args.pageTitle)}</title>
  ${faviconTag}
  ${args.headExtra ?? ""}
  <style>${args.style}</style>
</head>
<body>
  ${args.body}
  ${args.script ? `<script>${args.script}</script>` : ""}
</body>
</html>`;
}

export function resolveBrandingBasics(branding: BrandingConfig) {
  return {
    color: branding.color ?? "#1C5FAA",
    title: branding.title ?? "Human Verification",
    productName: branding.name ?? "Turnstile Verification"
  };
}
