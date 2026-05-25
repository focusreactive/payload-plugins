"use client";

import { useEffect } from "react";
import { getCookie } from "../utils/getCookie";
import { useABAnalytics } from "./ABAnalyticsProvider";
import { defaultGetExpCookieName } from "../../cookie/utils/defaultGetExpCookieName";
import { DEFAULT_VISITOR_ID_COOKIE_NAME } from "../../cookie/constants";

export interface ExperimentTrackerProps {
  experimentId: string;
  /**
   * Name of the cookie that holds the assigned variant bucket.
   * Use `resolveAbCookieNames(abCookies, experimentId).variantCookieName` to derive
   * this from a shared `AbCookieConfig`. Default: `exp_${experimentId}`.
   */
  variantCookieName?: string;
  /**
   * Name of the visitor ID cookie.
   * Use `resolveAbCookieNames(abCookies, experimentId).visitorCookieName` to derive
   * this from a shared `AbCookieConfig`. Default: 'ab_visitor_id'.
   */
  visitorCookieName?: string;
}

export function ExperimentTracker({
  experimentId,
  variantCookieName,
  visitorCookieName = DEFAULT_VISITOR_ID_COOKIE_NAME,
}: ExperimentTrackerProps) {
  const adapter = useABAnalytics();

  useEffect(() => {
    if (!adapter) return;

    const sessionKey = `ab_tracked_${experimentId}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(sessionKey)) {
      return;
    }

    const resolvedVariantCookie = variantCookieName ?? defaultGetExpCookieName(experimentId);
    const variantBucket = getCookie(resolvedVariantCookie);
    const visitorId = getCookie(visitorCookieName);

    if (!variantBucket || !visitorId) return;

    adapter.trackImpression({ experimentId, variantBucket, visitorId });

    sessionStorage.setItem(sessionKey, "1");
  }, [adapter, experimentId, variantCookieName, visitorCookieName]);

  return null;
}
