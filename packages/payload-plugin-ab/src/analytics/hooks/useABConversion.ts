"use client";

import { useCallback } from "react";

import { DEFAULT_VISITOR_ID_COOKIE_NAME } from "../../cookie/constants";
import { defaultGetExpCookieName } from "../../cookie/utils/defaultGetExpCookieName";
import { useABAnalytics } from "../components/ABAnalyticsProvider";
import { getCookie } from "../utils/getCookie";

export interface UseABConversionOptions {
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

export type TrackConversionFn = (args: {
  goalId: string;
  goalValue?: number;
}) => void;

export function useABConversion({
  experimentId,
  variantCookieName,
  visitorCookieName = DEFAULT_VISITOR_ID_COOKIE_NAME,
}: UseABConversionOptions): TrackConversionFn {
  const adapter = useABAnalytics();

  return useCallback(
    ({ goalId, goalValue }: { goalId: string; goalValue?: number }) => {
      if (!adapter) {return;}

      const resolvedVariantCookie =
        variantCookieName ?? defaultGetExpCookieName(experimentId);
      const variantBucket = getCookie(resolvedVariantCookie);
      const visitorId = getCookie(visitorCookieName);

      if (!variantBucket || !visitorId) {return;}

      adapter.trackConversion({
        experimentId,
        goalId,
        goalValue,
        variantBucket,
        visitorId,
      });
    },
    [adapter, experimentId, variantCookieName, visitorCookieName]
  );
}
