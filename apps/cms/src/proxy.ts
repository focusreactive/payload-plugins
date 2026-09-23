import { createResolveAbRewrite } from "@focus-reactive/payload-plugin-ab/middleware";
import createMiddleware from "next-intl/middleware";
import { draftMode } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { I18N_CONFIG } from "@/lib/config/i18n";
import { abAdapter } from "@/lib/plugins/ab/abAdapter";
import { buildInternalPathname } from "@/lib/plugins/ab/buildInternalPathname";
import type { ABVariantData } from "@/lib/plugins/ab/types";

import { abCookies } from "./lib/plugins/ab/abCookies";
import { routing } from "./lib/i18n/routing";

// The `<link rel="alternate">` tags are already emitted from our own path map in generateMeta.ts;
// the middleware's header would otherwise advertise a naive locale-prefixed path that 404s.
const intlMiddleware = createMiddleware({ ...routing, alternateLinks: false });

const localeCodes = I18N_CONFIG.locales.map((l) => l.code).join("|");
const localeRegex = new RegExp(`^/(${localeCodes})(/.*)?$`);

const resolveAbRewrite = createResolveAbRewrite<ABVariantData>({
  cookies: abCookies,
  getBucket: (v) => v.bucket,
  getPassPercentage: (v) => v.passPercentage,
  getRewritePath: (v) => v.rewritePath,
  storage: abAdapter,
});

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localeMatch = pathname.match(localeRegex);

  const matchedLocale = localeMatch?.[1];
  const isNextRoute = matchedLocale
    ? pathname.startsWith(`/${matchedLocale}/next/`)
    : pathname.startsWith("/next/");

  const { isEnabled: isDraftMode } = await draftMode();

  if (!isNextRoute && !isDraftMode) {
    const internalPathname = buildInternalPathname(
      pathname,
      matchedLocale,
      I18N_CONFIG.defaultLocale
    );
    const abResponse = await resolveAbRewrite(request, pathname, pathname, internalPathname);

    if (abResponse) {
      abResponse.headers.set("x-pathname", pathname);
      return abResponse;
    }
  }

  if (isNextRoute) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);

    return response;
  }

  const response = intlMiddleware(request);
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
