import { NextResponse } from "next/server";

import { getPayloadClient } from "@/dal";
import { placeholderPreviewURL, siteBlockPreviewFilename } from "@/lib/utils/blockPreviewImage";

const SLUG_PATTERN = /^[A-Za-z0-9]+$/u;

/** A site section's preview image in the add-section drawer, for signed-in admin users only. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const payload = await getPayloadClient();
  const { user } = await payload.auth({ headers: request.headers });

  if (!user || !SLUG_PATTERN.test(slug)) {
    return new Response(null, { status: 404 });
  }

  const label = new URL(request.url).searchParams.get("label") || slug;
  const { docs } = await payload.find({
    collection: "media",
    depth: 0,
    limit: 1,
    pagination: false,
    select: { filename: true, prefix: true, url: true },
    where: { filename: { equals: siteBlockPreviewFilename(slug) } },
  });
  const target = new URL(docs[0]?.url ?? placeholderPreviewURL(label), request.url);
  const response = NextResponse.redirect(target, 302);

  response.headers.set("Cache-Control", "private, max-age=300");

  return response;
}
