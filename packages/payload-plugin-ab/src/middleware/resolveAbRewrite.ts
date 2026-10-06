import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ResolveAbRewriteConfig } from "./types";
import { pickWeightedBucket } from "./utils/pickWeightedBucket";
import { pickUniformBucket } from "./utils/pickUniformBucket";
import { DEFAULT_VISITOR_ID_COOKIE_NAME } from "../cookie/constants";
import { defaultGetExpCookieName } from "../cookie/utils/defaultGetExpCookieName";

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
    bucketCookieMaxAge = expCookieMaxAge,
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

    if (!variants?.length) return null;

    const bucketCookieName = `${bucketCookiePrefix}_${manifestKey.replace(/^\//, "").replace(/\//g, "_")}`;
    const existingBucket = request.cookies.get(bucketCookieName)?.value;

    const existingVisitorId = request.cookies.get(visitorIdCookieName)?.value;
    const visitorId = existingVisitorId ?? crypto.randomUUID();

    const expCookieName = getExpCookieName(manifestKey);

    const isLiveBucket = (value: string | undefined): value is string =>
      value === "original" || variants.some((v) => getBucket(v) === value);

    const savedBucket = [existingBucket, request.cookies.get(expCookieName)?.value].find(
      isLiveBucket
    );
    const bucket =
      savedBucket ??
      (getPassPercentage
        ? pickWeightedBucket(variants, getBucket, getPassPercentage)
        : pickUniformBucket(variants, getBucket));

    if (bucket === "original" && existingBucket === "original") return null;

    const match = variants.find((v) => getBucket(v) === bucket);
    const url = request.nextUrl.clone();
    url.pathname = match ? getRewritePath(match) : originalRewritePath;
    const res = NextResponse.rewrite(url);

    if (existingBucket !== bucket) {
      res.cookies.set(bucketCookieName, bucket, {
        path: "/",
        sameSite: "lax",
        maxAge: bucketCookieMaxAge,
      });
    }

    if (!existingVisitorId) {
      res.cookies.set(visitorIdCookieName, visitorId, {
        path: "/",
        sameSite: "lax",
        maxAge: visitorIdMaxAge,
      });
    }

    if (!savedBucket) {
      res.cookies.set(expCookieName, bucket, {
        path: "/",
        sameSite: "lax",
        maxAge: expCookieMaxAge,
      });
    }

    return res;
  };
}
