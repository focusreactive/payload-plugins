import type { HeadingDocIssue, HeadingLevel } from "../../../../engine/types/analysis";
import type { Message } from "../../../../translations/types";

export function describeDocIssue(issue: HeadingDocIssue): { title: Message; body: Message } {
  switch (issue.type) {
    case "missing-h1":
      return {
        title: { key: "headings.missingH1.title" },
        body: { key: "headings.missingH1.body" },
      };
    case "multiple-h1":
      return {
        title: { key: "headings.multipleH1.title", vars: { count: issue.count } },
        body: { key: "headings.multipleH1.body" },
      };
    default: {
      const _exhaustive: never = issue;
      throw new Error(`Unhandled heading doc issue: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function formatSkippedLevels(skipped: HeadingLevel[]): string {
  return skipped.map((level) => `H${level}`).join("·");
}
