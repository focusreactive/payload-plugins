/**
 * Cookieless analytics (§5.10). Rendered only when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set;
 * NEXT_PUBLIC_PLAUSIBLE_SRC points at a self-hosted script (default: plausible.io).
 */
export function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) {
    return null;
  }
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
  return <script defer data-domain={domain} src={src} />;
}
