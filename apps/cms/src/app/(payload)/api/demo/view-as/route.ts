import { NextResponse } from "next/server";

import { getPayloadClient } from "@/dal";
import { findDemoPersonas } from "@/lib/auth/demoPersonas";
import { redirectWithSession } from "@/lib/auth/utils/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { origin } = url;
  const payload = await getPayloadClient();
  const personas = await findDemoPersonas(payload);
  const persona = personas.find((candidate) => candidate.slug === url.searchParams.get("persona"));

  if (!persona) {
    return new NextResponse(null, { status: 404 });
  }

  // Only a path inside the admin is followed, so the link cannot be turned into an open redirect.
  const requestedPath = url.searchParams.get("redirect") ?? "";
  const redirectPath = requestedPath.startsWith("/admin") ? requestedPath : "/admin";

  const response = await redirectWithSession({
    payload,
    redirectTo: `${origin}${redirectPath}`,
    user: persona.user,
  });
  payload.logger.info(`Demo persona switch to ${persona.user.email}`);
  return response;
}
