import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { marked } from "marked";

/**
 * Post body → HTML for feeds (§5.5). Rich text goes through Payload's Lexical converter (inline
 * blocks such as video or CTA banners are skipped); Markdown through marked (GFM). Both sources are
 * written by CMS editors, so no extra sanitising pass.
 */
export function postBodyToHtml(post: {
  contentFormat?: string | null;
  markdown?: string | null;
  content?: unknown;
}): string {
  if (post.contentFormat === "markdown") {
    return marked.parse(post.markdown ?? "", { async: false, gfm: true });
  }
  if (!post.content || typeof post.content !== "object") {
    return "";
  }
  return convertLexicalToHTML({
    converters: ({ defaultConverters }) => ({ ...defaultConverters, blocks: {} }),
    data: post.content as SerializedEditorState,
    disableContainer: true,
  });
}
