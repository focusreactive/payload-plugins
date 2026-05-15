import { createResolveAbRewrite } from "@focus-reactive/payload-plugin-ab/middleware";
import createMiddleware from "next-intl/middleware";
import { draftMode } from "next/headers";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

import { I18N_CONFIG } from "@/core/config/i18n";
import { abAdapter } from "@/core/lib/abTesting/abAdapter";
import { buildInternalPathname } from "@/core/lib/abTesting/buildInternalPathname";
import type { ABVariantData } from "@/core/lib/abTesting/types";

import { abCookies } from "./core/lib/abTesting/abCookies";
import { routing } from "./i18n/routing";

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
    const abResponse = await resolveAbRewrite(
      request,
      pathname,
      pathname,
      internalPathname
    );

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
