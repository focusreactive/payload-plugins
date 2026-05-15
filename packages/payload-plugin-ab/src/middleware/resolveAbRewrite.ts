import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEFAULT_VISITOR_ID_COOKIE_NAME } from "../cookie/constants";
import { defaultGetExpCookieName } from "../cookie/utils/defaultGetExpCookieName";
import type { ResolveAbRewriteConfig } from "./types";
import { pickUniformBucket } from "./utils/pickUniformBucket";
import { pickWeightedBucket } from "./utils/pickWeightedBucket";

const DEFAULT_BUCKET_COOKIE_PREFIX = "payload_ab_bucket";
const DEFAULT_VISITOR_MAX_AGE = 60 * 60 * 24 * 365;
const DEFAULT_EXP_MAX_AGE = 60 * 60 * 24 * 90;

export function createResolveAbRewrite<TVariantData extends object>(
  config: ResolveAbRewriteConfig<TVariantData>
) {
  const {
    storage,
    getBucket,
    getRewritePath,
    getPassPercentage,
    cookies: cookieConfig = {},
  } = config;

  const {
    bucketCookiePrefix = DEFAULT_BUCKET_COOKIE_PREFIX,
    visitorIdCookieName = DEFAULT_VISITOR_ID_COOKIE_NAME,
    getExpCookieName = defaultGetExpCookieName,
    visitorIdMaxAge = DEFAULT_VISITOR_MAX_AGE,
    expCookieMaxAge = DEFAULT_EXP_MAX_AGE,
  } = cookieConfig;

  return async function resolveAbRewrite(
    request: NextRequest,
    /** The URL pathname visible to the user (used as bucket cookie key). */
    visiblePathname: string,
    /** The manifest key to look up — typically the internal rewrite path. */
    manifestKey: string,
    /** Path to rewrite to when no variant is selected ('original' bucket). */
    originalRewritePath: string
  ): Promise<NextResponse | null> {
    let variants: TVariantData[] | null = null;

    try {
      variants = await storage.read(manifestKey);
    } catch {
      return null;
    }

    if (!variants?.length) {return null;}

    const bucketCookieName = `${bucketCookiePrefix}_${manifestKey.replace(/^\//, "").replaceAll(/\//g, "_")}`;
    const existingBucket = request.cookies.get(bucketCookieName)?.value;

    const existingVisitorId = request.cookies.get(visitorIdCookieName)?.value;
    const visitorId = existingVisitorId ?? crypto.randomUUID();

    const expCookieName = getExpCookieName(manifestKey);

    let bucket = existingBucket;
    if (!bucket) {
      bucket = getPassPercentage
        ? pickWeightedBucket(variants, getBucket, getPassPercentage)
        : pickUniformBucket(variants, getBucket);
    }

    const setAbCookies = (
      res: NextResponse,
      assignedBucket: string,
      isNewAssignment: boolean
    ) => {
      if (!existingVisitorId) {
        res.cookies.set(visitorIdCookieName, visitorId, {
          maxAge: visitorIdMaxAge,
          path: "/",
          sameSite: "lax",
        });
      }

      if (isNewAssignment) {
        res.cookies.set(expCookieName, assignedBucket, {
          maxAge: expCookieMaxAge,
          path: "/",
          sameSite: "lax",
        });
      }
    };

    if (bucket === "original") {
      if (!existingBucket) {
        const url = request.nextUrl.clone();

        url.pathname = originalRewritePath;

        const res = NextResponse.rewrite(url);

        res.cookies.set(bucketCookieName, "original", {
          path: "/",
          sameSite: "lax",
        });
        setAbCookies(res, "original", true);

        return res;
      }

      return null;
    }

    const match = variants.find((v) => getBucket(v) === bucket);
    if (!match) {return null;}

    const url = request.nextUrl.clone();
    url.pathname = getRewritePath(match);
    const res = NextResponse.rewrite(url);

    if (!existingBucket) {
      res.cookies.set(bucketCookieName, bucket, { path: "/", sameSite: "lax" });
      setAbCookies(res, bucket, true);
    } else {
      setAbCookies(res, bucket, false);
    }

    return res;
  };
}
