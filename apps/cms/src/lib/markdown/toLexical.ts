import { convertMarkdownToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import type { SanitizedConfig } from "payload";

import { generateRichText } from "@/lib/utils/generateRichText";

/**
 * Markdown → Lexical with Payload's own converter and the posts editor configuration (headings,
 * lists, links, quotes, tables, inline code). Used by the seed to build rich-text block content.
 */
export async function markdownToLexical(
  markdown: string,
  config: SanitizedConfig
): Promise<SerializedEditorState> {
  const editorConfig = await editorConfigFactory.fromEditor({
    config,
    editor: generateRichText("default"),
  });

  return convertMarkdownToLexical({ editorConfig, markdown });
}
