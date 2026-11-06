const RELATIVE_BASE = "http://local.invalid";
const RELATIVE_ORIGIN = new URL(RELATIVE_BASE).origin;
const WEB_PROTOCOLS = new Set(["http:", "https:"]);

function parseUrl(href: string): URL | null {
  try {
    return new URL(href, RELATIVE_BASE);
  } catch {
    return null;
  }
}

function decodePath(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

export function toPath(href: string): string | null {
  if (href.startsWith("#")) return null;

  const url = parseUrl(href);
  if (!url || !WEB_PROTOCOLS.has(url.protocol)) return null;

  const path = decodePath(url.pathname);
  if (path === null) return null;

  return path.replace(/\/+$/u, "") || "/";
}

export function originOf(href: string): string | null {
  const url = parseUrl(href);
  if (!url || !WEB_PROTOCOLS.has(url.protocol) || url.origin === RELATIVE_ORIGIN) return null;

  return url.origin;
}
