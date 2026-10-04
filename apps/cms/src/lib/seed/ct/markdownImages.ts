/**
 * Puts migrated article images back into the Markdown body (content doc §3). Pure functions.
 * A block = what the scraper counts in the HTML: a paragraph, a heading, a whole list, a code
 * block, a quote or a table.
 */

export interface ImageInsert {
  afterBlock: number;
  alt: string;
  url: string;
  title?: string | null;
}

export function splitMarkdownBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  type Kind = "list" | "table" | "quote" | "code" | "para";
  let kind: Kind | null = null;

  const flush = () => {
    if (current.length > 0) {
      blocks.push(current.join("\n"));
    }
    current = [];
    kind = null;
  };

  for (const line of markdown.split("\n")) {
    if (kind === "code") {
      current.push(line);
      if (line.trim().startsWith("```")) {
        flush();
      }
      continue;
    }
    if (line.trim().startsWith("```")) {
      flush();
      kind = "code";
      current.push(line);
      continue;
    }
    if (line.trim() === "") {
      // A blank line ends paragraphs, quotes and tables; lists may contain blank lines.
      if (kind !== "list") {
        flush();
      }
      continue;
    }
    if (/^#{1,6}\s/u.test(line)) {
      flush();
      blocks.push(line);
      continue;
    }
    const lineKind: Kind = /^\s*(?:[-*+]|\d+\.)\s/u.test(line)
      ? "list"
      : /^\s*\|/u.test(line)
        ? "table"
        : /^\s*>/u.test(line)
          ? "quote"
          : kind === "list" && /^\s{2,}\S/u.test(line)
            ? "list"
            : "para";
    if (kind !== null && lineKind !== kind) {
      flush();
    }
    kind = lineKind;
    current.push(line);
  }
  flush();
  return blocks;
}

function imageMarkdown(image: ImageInsert): string {
  const alt = image.alt.replaceAll(/[[\]]/gu, "");
  const title = image.title ? ` "${image.title.replaceAll('"', "'")}"` : "";
  return `![${alt}](${image.url}${title})`;
}

/**
 * Inserts each image after its `afterBlock`-th block (clamped). When the scraped HTML block count
 * differs from the Markdown block count by more than 2, positions are scaled proportionally.
 * Returns the new Markdown and whether the proportional fallback was used.
 */
export function insertImages(
  markdown: string,
  images: ImageInsert[],
  htmlBlockCount?: number
): { markdown: string; proportional: boolean } {
  const blocks = splitMarkdownBlocks(markdown);
  const proportional =
    htmlBlockCount !== undefined &&
    htmlBlockCount > 0 &&
    Math.abs(htmlBlockCount - blocks.length) > 2;

  const positioned = images.map((image) => {
    const raw = proportional
      ? Math.round((image.afterBlock / htmlBlockCount!) * blocks.length)
      : image.afterBlock;
    return { image, position: Math.max(0, Math.min(blocks.length, raw)) };
  });

  const out: string[] = [];
  for (let i = 0; i <= blocks.length; i++) {
    for (const { image, position } of positioned) {
      if (position === i) {
        out.push(imageMarkdown(image));
      }
    }
    if (i < blocks.length) {
      out.push(blocks[i]!);
    }
  }

  return { markdown: out.join("\n\n"), proportional };
}

/** Images already present in Markdown (e.g. a later GitLab export): `![alt](src "title")`. */
export function findMarkdownImages(markdown: string): { alt: string; src: string }[] {
  return [...markdown.matchAll(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/gu)].map((m) => ({
    alt: m[1] ?? "",
    src: m[2]!,
  }));
}
