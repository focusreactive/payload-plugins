import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { marked } from "marked";

/**
 * Post body → HTML for feeds (§5.5): the rich text through Payload's Lexical converter (inline
 * blocks such as video or CTA banners are skipped), then migrated Markdown through marked (GFM).
 * Both sources are written by CMS editors, so no extra sanitising pass.
 */
export function postBodyToHtml(post: { markdown?: string | null; content?: unknown }): string {
  const richText =
    post.content && typeof post.content === "object"
      ? convertLexicalToHTML({
          converters: ({ defaultConverters }) => ({ ...defaultConverters, blocks: {} }),
          data: post.content as SerializedEditorState,
          disableContainer: true,
        })
      : "";
  const markdown = post.markdown?.trim()
    ? marked.parse(post.markdown, { async: false, gfm: true })
    : "";
  return richText + markdown;
}
