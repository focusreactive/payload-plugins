import { describe, expect, it } from "vitest";

import { toFolderRecord } from "../../src/core/folderRecords.js";
import type { SiblingRow } from "../../src/core/orderKeys.js";
import { listIssues, listedIssuesPerKind } from "../../src/core/treeIssues.js";
import type { TreeIssue } from "../../src/core/treeIssues.js";
import { analyzeFolders } from "../../src/core/verifyFolders.js";
import { staleStructureFields, toOwnSegments } from "../../src/core/verifyPages.js";
import { planSiblingKeys } from "../../src/core/verifySiblings.js";
import type { ResolvedOptions } from "../../src/types.js";

const options = { folders: { slug: "folders" } } as ResolvedOptions;
const keys = ["en", "de"];

const folder = (id: number, parent: number | null, slug: string, extra = {}) =>
  toFolderRecord({
    ancestorIds: "/",
    depth: 1,
    fullPath: { de: `/${slug}`, en: `/${slug}` },
    id,
    parent,
    slug: { en: slug },
    ...extra,
  });

const row = (id: number, orderKey: string | null, createdAt = "2026-01-01T00:00:00.000Z") =>
  ({ collection: "pages", createdAt, id, kind: "page", orderKey }) as SiblingRow;

describe("analyzeFolders", () => {
  it("finds a cycle and names the lowest id as the folder that moves to the top", () => {
    const { issues, parentFixes } = analyzeFolders({
      defaultKey: "en",
      keys,
      options,
      records: [folder(7, 9, "a"), folder(8, 7, "b"), folder(9, 8, "c"), folder(1, null, "free")],
    });

    expect(parentFixes.map((fix) => fix.folder.id)).toEqual([7]);
    expect(issues.filter((issue) => issue.kind === "folderCycle")).toEqual([
      expect.objectContaining({ folders: [7, 8, 9], item: { collection: "folders", id: 7 } }),
    ]);
  });

  it("a folder that is its own parent is a cycle of one", () => {
    const { parentFixes } = analyzeFolders({
      defaultKey: "en",
      keys,
      options,
      records: [folder(3, 3, "loop")],
    });

    expect(parentFixes.map((fix) => fix.folder.id)).toEqual([3]);
  });

  it("a parent that does not exist sends the folder to the top level", () => {
    const { folders, issues } = analyzeFolders({
      defaultKey: "en",
      keys,
      options,
      records: [folder(5, 99, "orphan", { ancestorIds: "/99/", depth: 2 })],
    });

    expect(issues.map((issue) => issue.kind)).toEqual(["folderParentMissing", "folderPath"]);
    expect(folders.get("5")?.plan?.fullPath).toEqual({ de: "/orphan", en: "/orphan" });
  });

  it("a folder without a slug is a conflict and leaves what is beneath it unplanned", () => {
    const { folders, issues } = analyzeFolders({
      defaultKey: "en",
      keys,
      options,
      records: [folder(1, null, "", { slug: {} }), folder(2, 1, "child")],
    });

    expect(issues.map((issue) => issue.kind)).toEqual(["folderSlugMissing"]);
    expect(folders.get("2")?.plan).toBeNull();
  });

  it("a trashed folder is never reported", () => {
    const { issues } = analyzeFolders({
      defaultKey: "en",
      keys,
      options,
      records: [folder(1, null, "gone", { deletedAt: "2026-01-01", fullPath: {} })],
    });

    expect(issues).toEqual([]);
  });
});

describe("planSiblingKeys", () => {
  it("gives unkeyed rows keys after the keyed ones, oldest first", () => {
    const { rewrites } = planSiblingKeys(null, [
      row(1, null, "2026-01-03T00:00:00.000Z"),
      row(2, "a0"),
      row(3, null, "2026-01-02T00:00:00.000Z"),
    ]);

    expect(rewrites.map(({ row: sibling }) => sibling.id)).toEqual([3, 1]);
    const [first, second] = rewrites.map(({ orderKey }) => orderKey);
    expect(first > "a0" && second > first).toBe(true);
  });

  it("rebalances the whole group when two rows share a key", () => {
    const { issues, rewrites } = planSiblingKeys(4, [row(1, "a0"), row(2, "a0"), row(3, "a1")]);

    expect(issues.map((issue) => issue.kind)).toEqual(["orderKeyEqual"]);
    expect(new Set(rewrites.map(({ orderKey }) => orderKey)).size).toBe(rewrites.length);
  });

  it("treats a key the generator cannot extend as invalid", () => {
    const { issues } = planSiblingKeys(null, [row(1, "A0"), row(2, "a1")]);

    expect(issues.map((issue) => issue.kind)).toEqual(["orderKeyInvalid"]);
  });

  it("changes nothing in a group that is in order", () => {
    expect(planSiblingKeys(null, [row(1, "a0"), row(2, "a1")])).toEqual({
      issues: [],
      rewrites: [],
    });
  });
});

describe("page helpers", () => {
  it("reads a segment per locale, an empty string as none", () => {
    expect(toOwnSegments({ de: "", en: "about" })).toEqual({ en: "about" });
    expect(toOwnSegments("about")).toEqual({ "-": "about" });
    expect(toOwnSegments(null)).toEqual({});
  });

  it("a version written before the plugin matches a page with no structure", () => {
    expect(
      staleStructureFields({ folder: null, orderKey: null, structureRevision: 0 }, {})
    ).toEqual([]);
    expect(
      staleStructureFields(
        { folder: 3, orderKey: "a0", structureRevision: 2 },
        { folder: 4, orderKey: "a1", structureRevision: 1 }
      )
    ).toEqual(["folder", "orderKey", "structureRevision"]);
    expect(
      staleStructureFields(
        { folder: 3, orderKey: "a0", structureRevision: 2 },
        { folder: { id: 3 }, orderKey: "a0", structureRevision: 2 }
      )
    ).toEqual([]);
  });
});

const danglingIssue = (id: number): TreeIssue => ({
  fixable: true,
  fromPath: `/${id}`,
  id,
  kind: "danglingRedirect",
  locale: null,
  message: "",
  target: null,
});

describe("listIssues", () => {
  it("counts every issue and lists the first hundred of each kind", () => {
    const many = Array.from({ length: listedIssuesPerKind + 20 }, (_, index) =>
      danglingIssue(index)
    );

    const list = listIssues([
      ...many,
      { fixable: false, ids: [1, 2], kind: "treeStateRows", message: "" },
    ]);

    expect(list.counts.danglingRedirect).toBe(listedIssuesPerKind + 20);
    expect(list.counts.treeStateRows).toBe(1);
    expect(list.issues).toHaveLength(listedIssuesPerKind + 1);
    expect(list).toMatchObject({ total: listedIssuesPerKind + 21, truncated: true });
  });
});
