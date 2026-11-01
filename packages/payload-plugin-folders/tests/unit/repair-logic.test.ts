import { describe, expect, it } from "vitest";

import type { RepairResult } from "../../src/core/repair.js";
import {
  hasFixableDrift,
  repairListLimit,
  repairListingOf,
} from "../../src/admin/Repair/repairLogic.js";
import { translateWith } from "../helpers/translate.js";

const translate = translateWith("en");

const issue = (index: number, fixable = true) =>
  ({
    fixable,
    item: { collection: "folders", id: index },
    kind: "folderPath",
    message: `Folder ${index} should be at /a in en but holds /b`,
    fullPath: [],
    path: "/a",
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
    const listing = repairListingOf(result({}), translate);

    expect(listing).toMatchObject({ isClean: true, isRepairable: false, urlChanges: 0 });
  });

  it("lists what repair would fix, in the admin's words, with the URL count", () => {
    const listing = repairListingOf(
      result({ changes: { samples: [], total: 5 }, fixed: list(2) }),
      translate
    );

    expect(listing.isClean).toBe(false);
    expect(listing.isRepairable).toBe(true);
    expect(listing.urlChanges).toBe(5);
    expect(listing.fixed).toEqual({
      lines: [
        "Folder 1 has out-of-date ancestry data and stays at /a",
        "Folder 2 has out-of-date ancestry data and stays at /a",
      ],
      more: 0,
      total: 2,
    });
  });

  it("keeps conflicts apart: a tree with only conflicts is not repairable", () => {
    const listing = repairListingOf(result({ conflicts: list(3) }), translate);

    expect(listing.isClean).toBe(false);
    expect(listing.isRepairable).toBe(false);
    expect(listing.conflicts.total).toBe(3);
    expect(listing.fixed.total).toBe(0);
  });

  it("writes out the first lines and counts the rest as more", () => {
    const listing = repairListingOf(result({ fixed: list(repairListLimit + 30) }), translate);

    expect(listing.fixed.lines).toHaveLength(repairListLimit);
    expect(listing.fixed.more).toBe(30);
    expect(listing.fixed.total).toBe(repairListLimit + 30);
  });

  it("counts what the server left out of its own list as more, which is the truncation", () => {
    // The server lists at most 100 per kind; its total is complete.
    const listing = repairListingOf(result({ fixed: list(450, 100) }), translate);

    expect(listing.fixed.lines).toHaveLength(repairListLimit);
    expect(listing.fixed.more).toBe(400);
    expect(listing.fixed.total).toBe(450);
  });
});

describe("the warning for a large rebuild", () => {
  it("carries the number of rows when the server says the rebuild is large", () => {
    const writes = {
      folders: 1,
      orderKeys: 2,
      pages: 3,
      redirectsDeleted: 4,
      redirectsWritten: 5,
      versions: 6,
    };

    expect(
      repairListingOf(result({ fixed: list(1), isLarge: true, writes }), translate).largeWrites
    ).toBe(21);
    expect(
      repairListingOf(result({ fixed: list(1), isLarge: false, writes }), translate).largeWrites
    ).toBeNull();
    // Nothing to rebuild, nothing to wait for.
    expect(repairListingOf(result({ isLarge: true, writes }), translate).largeWrites).toBeNull();
  });

  it("is worded in both languages, with the terminal command", () => {
    for (const language of ["en", "de"] as const) {
      const text = translateWith(language)("repairWarnLarge", { count: 250 });

      expect(text).toContain("250");
      expect(text).toContain("npm run repair");
      expect(text).toContain("npx payload run dist/bin/repair.js");
    }
  });
});

describe("the drift banner", () => {
  it("shows for what a rebuild fixes and not for what it cannot", () => {
    expect(hasFixableDrift({ fixable: 1 })).toBe(true);
    // A folder without a slug or a held-back clash is a conflict: a banner for it would never clear.
    expect(hasFixableDrift({ fixable: 0 })).toBe(false);
    expect(hasFixableDrift(null)).toBe(false);
  });
});
