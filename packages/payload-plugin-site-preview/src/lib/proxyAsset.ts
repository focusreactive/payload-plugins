import { SITE_TIMEOUT_MS } from "./constants.js";

const PASSED_HEADERS = ["content-type", "cache-control", "etag", "last-modified"];

// One of the page's css, js, font or image files, fetched from the site so the frame keeps a
// single origin — fonts are refused across origins, and a sprite's `<use href>` always is.
export const proxyAsset = async (origin: string, path: string[], search: string) => {
  const res = await fetch(`${origin}/${path.map(encodeURIComponent).join("/")}${search}`, {
    signal: AbortSignal.timeout(SITE_TIMEOUT_MS),
  }).catch(() => null);
  if (!res) return new Response(null, { status: 502 });

  const headers = new Headers();
  for (const name of PASSED_HEADERS) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(res.body, { status: res.status, headers });
};
