import { describe, expect, it } from "vitest";
import { extractHeadings } from "../../../../src/engine/runAnalysis/services/derive-vitals/headings";
import type { YoastResearcher } from "../../../../src/engine/researcherAdapter";

function researcherWith(entries: unknown): YoastResearcher {
  return {
    getResearch: (name: string) => (name === "getSubheadingTextLengths" ? entries : undefined),
  };
}
const noResearch: YoastResearcher = { getResearch: () => undefined };
const paperWith = (text: string) => ({ getText: () => text });

describe("extractHeadings", () => {
  it("parses level + text from the research entries, in order", () => {
    const r = researcherWith([
      { subheading: "" },
      { subheading: "<h1>Title</h1>" },
      { subheading: '<h2 class="x">Section</h2>' },
    ]);
    expect(extractHeadings(r, paperWith(""))).toEqual([
      { level: 1, text: "Title" },
      { level: 2, text: "Section" },
    ]);
  });

  it("strips inner tags and collapses whitespace", () => {
    const r = researcherWith([{ subheading: "<h2><a href='#'>Read   <b>me</b></a></h2>" }]);
    expect(extractHeadings(r, paperWith(""))).toEqual([{ level: 2, text: "Read me" }]);
  });

  it("keeps empty headings as empty text", () => {
    const r = researcherWith([{ subheading: "<h3></h3>" }]);
    expect(extractHeadings(r, paperWith(""))).toEqual([{ level: 3, text: "" }]);
  });

  it("falls back to parsing paper HTML when the research is unavailable", () => {
    const html = "<h1>A</h1><p>x</p><h2>B</h2>";
    expect(extractHeadings(noResearch, paperWith(html))).toEqual([
      { level: 1, text: "A" },
      { level: 2, text: "B" },
    ]);
  });

  it("returns [] when there are no headings", () => {
    expect(extractHeadings(noResearch, paperWith("<p>no headings</p>"))).toEqual([]);
  });
});
