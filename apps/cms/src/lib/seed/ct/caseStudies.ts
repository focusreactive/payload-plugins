import type { SeedContext } from "./context";
import { listItems, paragraphs, splitSections } from "./sections";
import type { Section } from "./sections";

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

/** The dump gives each study four sub-headings: technologies, problem, solution and result. */
function part(subsections: Section["subsections"], heading: RegExp): string {
  return subsections.find((sub) => heading.test(sub.heading))?.body.trim() ?? "";
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
      const technologies = part(sec.subsections, /technolog|tools|stack/iu);
      const sector =
        SECTOR_RULES.find(([, re]) => re.test(`${sec.heading} ${text}`))?.[0] ?? "other";
      return {
        problem: part(sec.subsections, /problem|challenge/iu) || plain[0] || "",
        result: part(sec.subsections, /result|outcome|impact/iu) || plain[2] || "",
        sector,
        // "Solutions/Technologies" is the technology list, not the solution.
        solution:
          sec.subsections
            .find(
              (sub) => /solution|approach/iu.test(sub.heading) && !/technolog/iu.test(sub.heading)
            )
            ?.body.trim() ||
          plain[1] ||
          "",
        technologies: (listItems(technologies).length > 0
          ? listItems(technologies)
          : [technologies]
        )
          .filter(Boolean)
          .join(", "),
        title: sec.heading,
      };
    })
    .filter((item) => item.title && (item.problem || item.solution));
  return cache;
}
