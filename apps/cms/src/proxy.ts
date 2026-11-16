import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { I18N_CONFIG } from "@/lib/config/i18n";

import { routing } from "./lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const localeCodes = I18N_CONFIG.locales.map((l) => l.code).join("|");
const localeRegex = new RegExp(`^/(${localeCodes})(/.*)?$`);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localeMatch = pathname.match(localeRegex);

  const matchedLocale = localeMatch?.[1];
  const isNextRoute = matchedLocale
    ? pathname.startsWith(`/${matchedLocale}/next/`)
    : pathname.startsWith("/next/");

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
