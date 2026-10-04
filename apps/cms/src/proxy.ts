import { createResolveAbRewrite } from "@focus-reactive/payload-plugin-ab/middleware";
import createMiddleware from "next-intl/middleware";
import { draftMode } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { I18N_CONFIG } from "@/lib/config/i18n";
import { abAdapter } from "@/lib/plugins/ab/abAdapter";
import { lookupLegacyRedirect } from "@/lib/redirects/legacy";
import { buildInternalPathname } from "@/lib/plugins/ab/buildInternalPathname";
import type { ABVariantData } from "@/lib/plugins/ab/types";

import { abCookies } from "./lib/plugins/ab/abCookies";
import { routing } from "./lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const localeCodes = I18N_CONFIG.locales.map((l) => l.code).join("|");
const localeRegex = new RegExp(`^/(${localeCodes})(/.*)?$`);

const resolveAbRewrite = createResolveAbRewrite<ABVariantData>({
  cookies: abCookies,
  getBucket: (v) => v.bucket,
  getPassPercentage: (v) => v.passPercentage,
  getRewritePath: (v) => v.rewritePath,
  storage: abAdapter,
});

const ASSET_PATH =
  /\.(?:png|jpe?g|gif|svg|ico|webp|avif|css|js|map|txt|xml|woff2?|ttf|json|pdf|webmanifest)$/iu;

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Files never reach locale routing (the matcher also excludes them; this is the safety net).
  if (ASSET_PATH.test(pathname)) {
    return NextResponse.next();
  }

  // Every old address keeps working (§5.4): static map of the migrated site, query preserved.
  const legacyTarget = lookupLegacyRedirect(pathname);
  if (legacyTarget) {
    const url = request.nextUrl.clone();
    url.pathname = legacyTarget;
    return NextResponse.redirect(url, 308);
  }

  // Unknown dotted paths (e.g. /legacy-campaign.html) continue through locale routing so the CMS
  // redirects collection (PayloadRedirects) can still resolve them.
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
  // Dotted paths now reach the proxy (legacy .html redirects); files are still excluded here.
  matcher: [
    "/((?!api|admin|_next|_vercel|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|css|js|map|txt|xml|woff2?|ttf|json|pdf|webmanifest)$).*)",
  ],
};
