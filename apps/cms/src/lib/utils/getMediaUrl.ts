import { getServerSideURL } from "./getURL";
import { withMediaVersion } from "./mediaVersion";

function normalizeHostname(hostname: string): string {
  if (hostname.includes(".localhost")) {
    return "localhost";
  }
  return hostname;
}

function withCacheTag(url: string, cacheTag?: string | null): string {
  if (!cacheTag) {
    return url;
  }

  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}${encodeURIComponent(cacheTag)}`;
}

export function isAbsoluteMediaUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Absolute Blob URLs stay absolute. Relative URLs are prefixed with the server
 * origin so metadata such as og:image does not concatenate a second host.
 */
export const getMediaUrl = (url: string | null | undefined, cacheTag?: string | null): string => {
  if (!url) {
    return "";
  }

  if (isAbsoluteMediaUrl(url)) {
    let absolute = url;

    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes(".localhost")) {
        urlObj.hostname = normalizeHostname(urlObj.hostname);
        absolute = urlObj.toString();
      }
    } catch {
      // keep the original absolute URL
    }

    return withCacheTag(absolute, cacheTag);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "";
  const finalBaseUrl = baseUrl || (typeof window === "undefined" ? getServerSideURL() : "");

  return withCacheTag(`${finalBaseUrl}${url}`, cacheTag);
};

/** Version a URL that may already be absolute, without prefixing relative paths. */
export function toDeliveryUrl(url: string, filesize?: number | null): string {
  if (!url) {
    return "";
  }

  const normalized = isAbsoluteMediaUrl(url) ? getMediaUrl(url) : url;
  return withMediaVersion(normalized, filesize);
}

export function absoluteMediaUrl(url: string | null | undefined, filesize?: number | null): string {
  return withMediaVersion(getMediaUrl(url), filesize);
}
