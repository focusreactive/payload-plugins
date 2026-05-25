import { DEFAULT_VISITOR_ID_COOKIE_NAME } from "../constants";
import type { AbCookieConfig } from "../types";
import { defaultGetExpCookieName } from "./defaultGetExpCookieName";

export interface ResolvedAbCookieNames {
  /** Resolved variant cookie name for the given experiment. */
  variantCookieName: string;
  /** Resolved visitor ID cookie name. */
  visitorCookieName: string;
}

/**
 * Resolves an `AbCookieConfig` + experiment ID into plain serializable strings.
 * Use this in Server Components to derive props for Client Components.
 */
export function resolveAbCookieNames(
  config: AbCookieConfig | undefined,
  experimentId: string
): ResolvedAbCookieNames {
  return {
    variantCookieName: (config?.getExpCookieName ?? defaultGetExpCookieName)(
      experimentId
    ),
    visitorCookieName:
      config?.visitorIdCookieName ?? DEFAULT_VISITOR_ID_COOKIE_NAME,
  };
}
