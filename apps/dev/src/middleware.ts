import { createResolveAbRewrite } from "@focus-reactive/payload-plugin-ab/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { abAdapter as storage } from "./lib/ab-testing/dbAdapter";
import type { VariantData } from "./lib/ab-testing/types";

const resolveAbRewrite = createResolveAbRewrite<VariantData>({
  getBucket: (v) => v.bucket,
  getPassPercentage: (v) => v.passPercentage,
  getRewritePath: (v) => v.rewritePath,
  storage,
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const result = await resolveAbRewrite(
    request as any,
    pathname,
    pathname,
    pathname
  );
  return result ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
