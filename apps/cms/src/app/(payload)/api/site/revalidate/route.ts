import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { cacheTag } from "@/lib/utils/cacheTags";
import { revalidateScopedTag } from "@/lib/utils/scopedCache";

/**
 * Refreshes every cached page after content was written from outside the app (a seed script),
 * where the collection hooks that normally do this cannot run.
 *
 *   POST /api/site/revalidate?secret=<PREVIEW_SECRET>
 */
export async function POST(request: NextRequest): Promise<Response> {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!process.env.PREVIEW_SECRET || secret !== process.env.PREVIEW_SECRET) {
    return Response.json({ revalidated: false }, { status: 403 });
  }

  revalidateScopedTag(cacheTag({ type: "entities" }), "max");
  revalidateScopedTag(cacheTag({ type: "sitemap" }), "max");
  revalidatePath("/", "layout");

  return Response.json({ revalidated: true });
}
