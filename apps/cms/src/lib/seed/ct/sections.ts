/** Splits a cleaned page body (headings start at h2) into the groups recipes turn into blocks. */

export interface SubSection {
  heading: string;
  body: string;
}

export interface Section {
  heading: string;
  /** Body before the first h3. */
  body: string;
  subsections: SubSection[];
}

export interface PageSections {
  /** Everything before the first h2. */
  intro: string;
  sections: Section[];
}

function splitBy(
  markdown: string,
  level: 2 | 3
): { lead: string; parts: { heading: string; body: string }[] } {
  const marker = new RegExp(`^${"#".repeat(level)}\\s+(.+)$`, "u");
  const lead: string[] = [];
  const parts: { heading: string; lines: string[] }[] = [];
  for (const line of markdown.split("\n")) {
    const match = marker.exec(line);
    if (match) {
      parts.push({ heading: match[1]!.trim(), lines: [] });
    } else if (parts.length > 0) {
      parts.at(-1)!.lines.push(line);
    } else {
      lead.push(line);
    }
  }
  return {
    lead: lead.join("\n").trim(),
    parts: parts.map((part) => ({ body: part.lines.join("\n").trim(), heading: part.heading })),
  };
}

export function splitSections(markdown: string): PageSections {
  const { lead, parts } = splitBy(markdown, 2);
  return {
    intro: lead,
    sections: parts.map((part) => {
      const inner = splitBy(part.body, 3);
      return { body: inner.lead, heading: part.heading, subsections: inner.parts };
    }),
  };
}

/** Paragraph text blocks (no headings, lists, tables). */
export function paragraphs(markdown: string): string[] {
  return markdown
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter((block) => block && !/^(#|[-*+]\s|\d+\.\s|\||>|!\[|`)/u.test(block));
}

export function firstSentence(text: string, max = 160): string {
  const plain = text
    .replaceAll(/[*_`[\]]|\(https?:[^)]*\)/gu, "")
    .replaceAll(/\s+/gu, " ")
    .trim();
  const sentence = /^(.+?[.!?])(\s|$)/u.exec(plain)?.[1] ?? plain;
  return sentence.length > max ? `${sentence.slice(0, max).replace(/\s+\S*$/u, "")}…` : sentence;
}

/** List items of the first bullet list in a body ("- item"). */
export function listItems(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((line) => /^\s*[-*+]\s+/u.test(line))
    .map((line) => line.replace(/^\s*[-*+]\s+/u, "").trim());
}

/** Rebuilds a section (and its sub-sections) as Markdown with headings below the block heading. */
export function sectionMarkdown(section: Section): string {
  return [section.body, ...section.subsections.map((sub) => `### ${sub.heading}\n\n${sub.body}`)]
    .filter(Boolean)
    .join("\n\n");
}
