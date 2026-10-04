// `@ct/legacy-map` (next.config.mjs) is the git-ignored legacy.local.json the CT seed generates,
// or this committed file when it has not been generated.
import generated from "@ct/legacy-map";

import extras from "./legacy.json";

/**
 * Old site URL → new path (plan §5.4). Keys are lowercased paths without a trailing slash, values
 * are unprefixed new paths. `legacy.json` holds the fixed extras; the CT seed's redirects step
 * writes the full map (do not edit by hand).
 */
const LEGACY_REDIRECTS: Record<string, string> = { ...extras, ...generated };

export function lookupLegacyRedirect(pathname: string): string | undefined {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // keep the raw path
  }
  const key = decoded.toLowerCase().replace(/\/+$/u, "") || "/";
  return LEGACY_REDIRECTS[key];
}
