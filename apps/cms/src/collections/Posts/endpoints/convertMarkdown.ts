import type { Endpoint } from "payload";

import { markdownToLexical } from "@/lib/markdown/toLexical";

/**
 * POST /api/posts/convert-markdown { markdown } → { content } (Lexical JSON). Used by the
 * "Convert to rich text" sidebar button; signed-in CMS users only.
 */
export const convertMarkdownEndpoint: Endpoint = {
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json?.()) as { markdown?: unknown } | undefined;
    if (typeof body?.markdown !== "string") {
      return Response.json({ error: "Expected { markdown: string }" }, { status: 400 });
    }

    const content = await markdownToLexical(body.markdown, req.payload.config);
    return Response.json({ content });
  },
  method: "post",
  path: "/convert-markdown",
};
