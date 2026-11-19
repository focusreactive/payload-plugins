import { NextResponse } from "next/server";

import { getAdminSettings } from "@/dal/getAdminSettings";
import type { Media } from "@/payload-types";

const DEFAULT_ICON = "/favicon.svg";

/** The admin's browser-tab icon: the icon set in Site Settings, or the app's own. */
export async function GET(request: Request): Promise<Response> {
  const settings = await getAdminSettings();
  const icon = settings.icon && typeof settings.icon === "object" ? (settings.icon as Media) : null;
  const target = new URL(icon?.url ?? DEFAULT_ICON, request.url);
  const response = NextResponse.redirect(target, 302);

  response.headers.set("Cache-Control", "public, max-age=300");

  return response;
}
