import { NextResponse } from "next/server";

import { getCachedGlobal } from "@/dal/getGlobals";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import type { Media, SiteSetting } from "@/payload-types";

const DEFAULT_ICON = "/favicon.ico";

/** The website's browser-tab icon: the one set in Site Settings, or the app's own. */
export async function GET(request: Request): Promise<Response> {
  const settings = (await getCachedGlobal(
    "site-settings",
    1,
    I18N_CONFIG.defaultLocale as Locale,
    false
  )()) as SiteSetting;
  const favicon = settings.general?.favicon;
  const icon = favicon && typeof favicon === "object" ? (favicon as Media) : null;
  const response = NextResponse.redirect(new URL(icon?.url ?? DEFAULT_ICON, request.url), 302);

  response.headers.set("Cache-Control", "public, max-age=300");

  return response;
}
