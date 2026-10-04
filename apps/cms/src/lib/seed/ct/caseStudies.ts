import type { SeedContext } from "./context";
import { paragraphs, splitSections } from "./sections";

export interface CaseStudyItem {
  title: string;
  sector: "automotive" | "agritech" | "finance" | "medical" | "other";
  technologies: string;
  problem: string;
  solution: string;
  result: string;
}

const SECTOR_RULES: [CaseStudyItem["sector"], RegExp][] = [
  ["automotive", /automotive|vehicle|\bcar\b|\bsdv\b|\bagl\b|\becu\b/iu],
  ["agritech", /agri|tractor|farm|heavy equipment|construction machinery/iu],
  ["finance", /bank|financ|trading|payment|insurance/iu],
  ["medical", /medical|health|clinical|patient|device/iu],
];

function labelled(body: string, label: RegExp): string | null {
  const line = body.split("\n").find((entry) => label.test(entry));
  return line
    ? line
        .replace(label, "")
        .replace(/^[\s:*–-]+/u, "")
        .trim() || null
    : null;
}

let cache: CaseStudyItem[] | null = null;

/** Case studies from the dump's case-studies page (entry 2.11); empty when it is not there. */
export function CASE_STUDY_ITEMS(ctx: SeedContext): CaseStudyItem[] {
  if (cache) {
    return cache;
  }
  const source = ctx.site.pages.find((page) => page.number === "2.11");
  if (!source) {
    cache = [];
    return cache;
  }
  const { sections } = splitSections(source.markdown);
  cache = sections
    .map((sec) => {
      const text = [sec.body, ...sec.subsections.map((sub) => `${sub.heading}\n${sub.body}`)].join(
        "\n\n"
      );
      const plain = paragraphs(text);
      const sector =
        SECTOR_RULES.find(([, re]) => re.test(`${sec.heading} ${text}`))?.[0] ?? "other";
      return {
        problem: labelled(text, /^\W*(the\s+)?(problem|challenge)\b\W*/iu) ?? plain[0] ?? "",
        result:
          labelled(text, /^\W*(business\s+)?(result|outcome|impact)s?\b\W*/iu) ?? plain[2] ?? "",
        sector,
        solution: labelled(text, /^\W*(\w+\s+)?(solution|approach)\b\W*/iu) ?? plain[1] ?? "",
        technologies: labelled(text, /^\W*(technolog(y|ies)|tech stack|tools)\b\W*/iu) ?? "",
        title: sec.heading,
      };
    })
    .filter((item) => item.title && (item.problem || item.solution));
  return cache;
}
