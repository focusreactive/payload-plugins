import { getResearch } from "../../../researcherAdapter";
import type { YoastResearcher } from "../../../researcherAdapter";
import type { HeadingLevel } from "../../../types/analysis";
import type { FlatHeading } from "./heading-tree";

interface PaperLike {
  getText?: () => string;
}

const GLOBAL_HEADING_RE = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/giu;
const SINGLE_HEADING_RE = /^<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>$/iu;

function toText(inner: string): string {
  return inner
    .replace(/<[^>]*>/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function parseEntry(html: string): FlatHeading | null {
  const m = SINGLE_HEADING_RE.exec(html.trim());
  if (!m) return null;

  return {
    level: Number(m[1] ?? 0) as HeadingLevel,
    text: toText(m[2] ?? ""),
  };
}

function fromResearch(researcher: YoastResearcher): FlatHeading[] | null {
  const entries = getResearch<{ subheading?: string }[]>(researcher, "getSubheadingTextLengths");
  if (!Array.isArray(entries)) return null;

  const headings: FlatHeading[] = [];

  for (const entry of entries) {
    if (!entry?.subheading) continue;

    const parsed = parseEntry(entry.subheading);
    if (parsed) headings.push(parsed);
  }

  return headings;
}

function fromHtml(html: string): FlatHeading[] {
  const headings: FlatHeading[] = [];

  for (const m of html.matchAll(GLOBAL_HEADING_RE)) {
    headings.push({
      level: Number(m[1] ?? 0) as HeadingLevel,
      text: toText(m[2] ?? ""),
    });
  }

  return headings;
}

export function extractHeadings(researcher: YoastResearcher, paper: PaperLike): FlatHeading[] {
  const researched = fromResearch(researcher);
  if (researched && researched.length > 0) return researched;

  const html = typeof paper.getText === "function" ? paper.getText() : "";

  return fromHtml(html);
}
