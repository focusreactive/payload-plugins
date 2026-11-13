import type {
  AnalysisResult,
  CheckResult,
  InclusiveFlag,
  InclusiveCategoryId,
  Status,
} from "../../../engine/types/analysis";

export type IssueCategory = "keyphrase" | "onpage" | "readability" | "inclusive";

export const ISSUE_CATEGORIES: readonly IssueCategory[] = [
  "keyphrase",
  "onpage",
  "readability",
  "inclusive",
];

export type Issue =
  | { kind: "check"; key: string; category: IssueCategory; status: Status; check: CheckResult }
  | {
      kind: "inclusive";
      key: string;
      category: "inclusive";
      status: Status;
      inclusiveCategory: InclusiveCategoryId;
      flag: InclusiveFlag;
    };

export interface CategorySummary {
  category: IssueCategory;
  score: number;
  status: Status;
  open: number;
  available: boolean;
}

export interface IssueBreakdown {
  open: Issue[];
  passed: Issue[];
  categories: CategorySummary[];
}

const URGENCY: Record<Status, number> = { bad: 0, warn: 1, good: 2 };

export function splitChecks(category: IssueCategory, checks: CheckResult[]) {
  const issues = fromChecks(category, checks);
  return {
    open: issues
      .filter((issue) => issue.status !== "good")
      .sort((a, b) => URGENCY[a.status] - URGENCY[b.status]),
    passed: issues.filter((issue) => issue.status === "good"),
  };
}

function fromChecks(category: IssueCategory, checks: CheckResult[]): Issue[] {
  return checks.map((check) => ({
    kind: "check",
    key: `${category}:${check.id}`,
    category,
    status: check.status,
    check,
  }));
}

export function buildIssues(result: AnalysisResult): IssueBreakdown {
  const hasKeyphrase = result.keyphraseText.trim().length > 0;

  const inclusiveIssues: Issue[] = result.inclusive.categories.flatMap((group) =>
    group.flags.map((flag, index) => ({
      kind: "inclusive" as const,
      key: `inclusive:${group.id}:${index}`,
      category: "inclusive" as const,
      status: "warn" as const,
      inclusiveCategory: group.id,
      flag,
    }))
  );

  const all: Issue[] = [
    ...(hasKeyphrase ? fromChecks("keyphrase", result.keyphrase.checks) : []),
    ...fromChecks("onpage", result.onPage.checks),
    ...fromChecks("readability", result.readability.checks),
    ...inclusiveIssues,
  ];

  const score = (issue: Issue) =>
    issue.kind === "check" ? issue.check.score : Number.POSITIVE_INFINITY;

  const open = all
    .filter((issue) => issue.status !== "good")
    .sort((a, b) => URGENCY[a.status] - URGENCY[b.status] || score(a) - score(b));
  const passed = all.filter((issue) => issue.status === "good");

  const openIn = (category: IssueCategory) => open.filter((i) => i.category === category).length;

  return {
    open,
    passed,
    categories: [
      {
        category: "keyphrase",
        score: result.keyphrase.ringScore,
        status: result.keyphrase.status,
        open: openIn("keyphrase"),
        available: hasKeyphrase,
      },
      {
        category: "onpage",
        score: result.onPage.ringScore,
        status: result.onPage.status,
        open: openIn("onpage"),
        available: true,
      },
      {
        category: "readability",
        score: result.readability.ringScore,
        status: result.readability.status,
        open: openIn("readability"),
        available: true,
      },
      {
        category: "inclusive",
        score: result.inclusive.ringScore,
        status: result.inclusive.status,
        open: openIn("inclusive"),
        available: true,
      },
    ],
  };
}
