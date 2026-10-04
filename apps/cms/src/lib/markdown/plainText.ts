/**
 * Markdown → plain text for search, embeddings, reading time and SEO analysis. Strips syntax,
 * keeps words (link text, image alt, table cells, code).
 */
export function markdownToPlainText(markdown: string | null | undefined): string {
  if (!markdown) {
    return "";
  }
  return markdown
    .replaceAll(/```[\s\S]*?```/gu, (block) => block.replaceAll(/```\w*/gu, " "))
    .replaceAll(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replaceAll(/^\s{0,3}#{1,6}\s+/gmu, "")
    .replaceAll(/^\s*>\s?/gmu, "")
    .replaceAll(/^\s*(?:[-*+]|\d+\.)\s+/gmu, "")
    .replaceAll(/^\s*\|?\s*:?-{3,}.*$/gmu, "")
    .replaceAll(/[|*_`~]/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();
}
