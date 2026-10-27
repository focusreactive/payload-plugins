import type { RawHtmlBlock } from "@/payload-types";

// `<script>` / `<style>` content is code, not prose — drop it entirely before stripping tags. The
// opening-tag match skips over quoted attribute values so a `>` inside an attribute does not end it early.
const SCRIPT_OR_STYLE = /<(script|style)\b(?:"[^"]*"|'[^']*'|[^>])*>[\s\S]*?<\/\1\s*>/giu;
const HTML_COMMENT = /<!--[\s\S]*?-->/gu;
const HTML_TAG = /<[^>]+>/gu;
const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&gt;": ">",
  "&lt;": "<",
  "&nbsp;": " ",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodeEntities(input: string): string {
  return input.replace(
    /&(?:amp|gt|lt|nbsp|quot|apos|#39);/gu,
    (match) => NAMED_ENTITIES[match] ?? match
  );
}

export function stripHtml(html: string): string {
  const withoutCode = html.replace(SCRIPT_OR_STYLE, " ").replace(HTML_COMMENT, " ");
  const withoutTags = withoutCode.replace(HTML_TAG, " ");
  return decodeEntities(withoutTags).replace(/\s+/gu, " ").trim();
}

export function extractRawHtmlText(block: RawHtmlBlock): string {
  return stripHtml(block.html ?? "");
}
