import type { HeadingDocIssue, HeadingLevel } from "../../../../engine/types/analysis";

export function describeDocIssue(issue: HeadingDocIssue): { title: string; body: string } {
  switch (issue.type) {
    case "missing-h1":
      return {
        title: "No H1 heading found",
        body: "Add a single top-level heading so the page has a clear title anchor.",
      };
    case "multiple-h1":
      return {
        title: `Multiple H1 headings (${issue.count})`,
        body: "Use exactly one H1 so search engines and screen readers get a single page title.",
      };
    default: {
      const _exhaustive: never = issue;
      throw new Error(`Unhandled heading doc issue: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function formatSkippedLevels(skipped: HeadingLevel[]): string {
  return `Skipped ${skipped.map((level) => `H${level}`).join("·")}`;
}
