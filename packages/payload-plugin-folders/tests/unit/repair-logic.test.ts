import { describe, expect, it } from "vitest";

import type { RepairResult } from "../../src/core/repair.js";
import { repairListLimit, repairListingOf } from "../../src/admin/Repair/repairLogic.js";

const issue = (index: number, fixable = true) =>
  ({
    fixable,
    item: { collection: "folders", id: index },
    kind: "folderPath",
    message: `Folder ${index} should be at /a in en but holds /b`,
  }) as RepairResult["fixed"]["issues"][number];

const list = (count: number, listed = count): RepairResult["fixed"] => ({
  counts: {} as RepairResult["fixed"]["counts"],
  issues: Array.from({ length: listed }, (_, index) => issue(index + 1)),
  total: count,
  truncated: listed < count,
});

const result = (overrides: Partial<RepairResult>): RepairResult =>
  ({
    changes: { samples: [], total: 0 },
    conflicts: list(0),
    dryRun: true,
    fixed: list(0),
    revision: null,
    writes: {},
    ...overrides,
  }) as RepairResult;

describe("repairListingOf", () => {
  it("is clean when there is nothing to fix and nothing left for a person", () => {
    const listing = repairListingOf(result({}));

    expect(listing).toMatchObject({ isClean: true, isRepairable: false, urlChanges: 0 });
  });

  it("lists what repair would fix, with the server's sentences and the URL count", () => {
    const listing = repairListingOf(result({ changes: { samples: [], total: 5 }, fixed: list(2) }));

    expect(listing.isClean).toBe(false);
    expect(listing.isRepairable).toBe(true);
    expect(listing.urlChanges).toBe(5);
    expect(listing.fixed).toEqual({
      lines: [
        "Folder 1 should be at /a in en but holds /b",
        "Folder 2 should be at /a in en but holds /b",
      ],
      more: 0,
      total: 2,
    });
  });

  it("keeps conflicts apart: a tree with only conflicts is not repairable", () => {
    const listing = repairListingOf(result({ conflicts: list(3) }));

    expect(listing.isClean).toBe(false);
    expect(listing.isRepairable).toBe(false);
    expect(listing.conflicts.total).toBe(3);
    expect(listing.fixed.total).toBe(0);
  });

  it("writes out the first lines and counts the rest as more", () => {
    const listing = repairListingOf(result({ fixed: list(repairListLimit + 30) }));

    expect(listing.fixed.lines).toHaveLength(repairListLimit);
    expect(listing.fixed.more).toBe(30);
    expect(listing.fixed.total).toBe(repairListLimit + 30);
  });

  it("counts what the server left out of its own list as more, which is the truncation", () => {
    // The server lists at most 100 per kind; its total is complete.
    const listing = repairListingOf(result({ fixed: list(450, 100) }));

    expect(listing.fixed.lines).toHaveLength(repairListLimit);
    expect(listing.fixed.more).toBe(400);
    expect(listing.fixed.total).toBe(450);
  });
});
