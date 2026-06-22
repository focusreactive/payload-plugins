"use client";

import { useEffect } from "react";
import { getCookie } from "../utils/getCookie";
import { waitForGtag } from "../utils/waitForGtag";
import { defaultGetExpCookieName } from "../../cookie/utils/defaultGetExpCookieName";
import { DEFAULT_VISITOR_ID_COOKIE_NAME } from "../../cookie/constants";
import { AB_DIMENSION_PARAMS } from "../../constants";

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

export interface ExperimentTrackerProps {
  /** The experiment identifier — typically the URL path / manifest key, e.g. "/en/about". */
  experimentId: string;
  /**
   * Name of the cookie that holds the assigned variant bucket.
   * Use `resolveAbCookieNames(abCookies, experimentId).variantCookieName` to derive
   * this from a shared `AbCookieConfig`. Default: `exp_${experimentId}`.
   */
  variantCookieName?: string;
  /**
   * Name of the visitor ID cookie.
   * Default: 'ab_visitor_id'.
   */
  visitorCookieName?: string;
}

export function ExperimentTracker({
  experimentId,
  variantCookieName,
  visitorCookieName = DEFAULT_VISITOR_ID_COOKIE_NAME,
}: ExperimentTrackerProps) {
  useEffect(() => {
    const resolvedVariantCookie = variantCookieName ?? defaultGetExpCookieName(experimentId);
    const variantBucket = getCookie(resolvedVariantCookie);
    const visitorId = getCookie(visitorCookieName);

    if (!variantBucket || !visitorId) return;

    waitForGtag((gtag) => {
      gtag("set", {
        [AB_DIMENSION_PARAMS.experiment]: experimentId,
        [AB_DIMENSION_PARAMS.variant]: variantBucket,
        [AB_DIMENSION_PARAMS.visitorId]: visitorId,
      });
    });
  }, [experimentId, variantCookieName, visitorCookieName]);

  return null;
}
