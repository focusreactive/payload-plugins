import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/dal/payload-client";
import { ingestInsightFromPassle } from "@/lib/passle/ingestInsightFromPassle";

/**
 * POST /api/passle-ingest
 *
 * Stands in for the real Passle webhook receiver: the real webhook carries
 * only a post shortcode, and everything else about the post is pulled from
 * the Passle API separately. This route lives directly under /api, as a
 * sibling of Payload's own catch-all, rather than under a locale-prefixed
 * path, because the i18n proxy's matcher only reaches routes Payload itself
 * generates and drops a custom route placed anywhere else.
 */
export async function POST(request: Request) {
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const postShortcode = (requestBody as { PostShortcode?: unknown } | null)?.PostShortcode;
  if (typeof postShortcode !== "string" || postShortcode.trim() === "") {
    return NextResponse.json(
      { error: 'Request body must include a non-empty "PostShortcode" string.' },
      { status: 400 }
    );
  }

  const payload = await getPayloadClient();

  try {
    const result = await ingestInsightFromPassle({ payload, postShortcode });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Passle ingest failed.";
    const isUnknownShortcode = message.includes("Passle has no post with shortcode");

    payload.logger.error(error, `Passle ingest failed for shortcode "${postShortcode}"`);
    return NextResponse.json({ error: message }, { status: isUnknownShortcode ? 404 : 500 });
  }
}
