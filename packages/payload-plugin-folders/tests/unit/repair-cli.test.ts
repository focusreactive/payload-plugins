import { describe, expect, it } from "vitest";

import { formatRepairReport, parseRepairArguments } from "../../src/bin/repairReport.js";
import type { RepairResult } from "../../src/core/repair.js";
import { listIssues } from "../../src/core/treeIssues.js";

describe("the repair script's flags", () => {
  it("reads --dry-run and --no-redirects after the separator", () => {
    expect(parseRepairArguments(["--", "--dry-run"])).toEqual({
      dryRun: true,
      redirects: undefined,
    });
    expect(parseRepairArguments(["--dry-run", "--no-redirects"])).toEqual({
      dryRun: true,
      redirects: false,
    });
    expect(parseRepairArguments([])).toEqual({ dryRun: false, redirects: undefined });
  });

  it("refuses a flag it does not know, and names the ones it has", () => {
    expect(() => parseRepairArguments(["--force"])).toThrow(/Unknown option "--force".*--dry-run/u);
  });
});

describe("the repair report", () => {
  const result = (overrides: Partial<RepairResult> = {}): RepairResult => ({
    changes: { samples: [], total: 12 },
    conflicts: listIssues([
      {
        count: 2,
        fixable: false,
        items: [],
        kind: "duplicatePath",
        locale: "en",
        message: "2 items claim /contact in en",
        path: "/contact",
      },
    ]),
    dryRun: true,
    fixed: listIssues([]),
    revision: null,
    writes: {
      folders: 1,
      orderKeys: 2,
      pages: 3,
      redirectsDeleted: 0,
      redirectsWritten: 4,
      versions: 5,
    },
    ...overrides,
  });

  it("says nothing was written in a dry run, lists the conflicts and counts the rows", () => {
    expect(formatRepairReport(result())).toBe(
      [
        "Folder tree repair (dry run, nothing written)",
        "To fix: none",
        "Conflicts left for you: 1",
        "  - 2 items claim /contact in en",
        "URL changes: 12",
        "Rows to write: folders 1, pages 3, order keys 2, latest versions 5, redirect rows 4, redirect rows deleted 0",
      ].join("\n")
    );
  });

  it("past tense after a real run, and the first five of a kind with the rest counted", () => {
    const fixed = listIssues(
      Array.from({ length: 7 }, (_, index) => ({
        fixable: true as const,
        fromPath: `/${index}`,
        id: index,
        kind: "danglingRedirect" as const,
        locale: null,
        message: `redirect ${index}`,
        target: null,
      }))
    );

    const report = formatRepairReport(result({ dryRun: false, fixed }));

    expect(report).toContain("Fixed: 7");
    expect(report).toContain("  - redirect 4");
    expect(report).not.toContain("redirect 5");
    expect(report).toContain("  - 2 more of kind danglingRedirect");
    expect(report).toContain("Rows written:");
  });
});
