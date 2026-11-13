import { describe, expect, it } from "vitest";

import {
  bannerKeyOf,
  deleteHeadlineOf,
  deleteListingOf,
  doneKeyOf,
  duplicateRefusalOf,
  isDeleteConfirmed,
  isPublishNoOp,
  isRunning,
  mergeResumed,
  parseDeleteListing,
  percentOf,
  publishSummaryOf,
  refusedCountOf,
  rootsOf,
  skippedLinesOf,
  titleKeyOf,
  withoutOperation,
  withProgress,
} from "../../src/admin/Operations/operationLogic.js";
import type { OperationView } from "../../src/admin/Operations/operationLogic.js";
import { folderRow, pageRow } from "../helpers/treeItems.js";

describe("deleteListingOf, the list a delete dialog shows", () => {
  it("reads a folder and a page with its status from the server's lines", () => {
    expect(
      parseDeleteListing(["/news (folder)", "/news/a (published)", "/news/b (draft)"])
    ).toEqual([
      { isFolder: true, isRootPage: false, path: "/news", status: null },
      { isFolder: false, isRootPage: false, path: "/news/a", status: "published" },
      { isFolder: false, isRootPage: false, path: "/news/b", status: "draft" },
    ]);
  });

  it("marks a page that sits at its folder's path as that folder's root page", () => {
    const rows = parseDeleteListing(["/news (folder)", "/news (published)", "/news/a (draft)"]);

    expect(rows.map((row) => row.isRootPage)).toEqual([false, true, false]);
    expect(
      deleteListingOf({
        folders: 1,
        pages: 2,
        sample: ["/news (folder)", "/news (published)", "/news/a (draft)"],
      }).rootPageCount
    ).toBe(1);
  });

  it("counts the rest as 'and N more' beyond the first 50", () => {
    const sample = Array.from({ length: 50 }, (_, index) => `/p/${index} (published)`);

    expect(deleteListingOf({ folders: 12, pages: 75, sample }).moreCount).toBe(37);
    expect(
      deleteListingOf({ folders: 1, pages: 2, sample: ["/a (folder)", "/a/b (draft)"] }).moreCount
    ).toBe(1);
    expect(deleteListingOf({ folders: 0, pages: 1, sample: ["/a (draft)"] }).moreCount).toBe(0);
  });

  it("keeps a line it cannot split as a path", () => {
    expect(parseDeleteListing(["(no URL yet)"])[0]).toMatchObject({ isFolder: false });
  });
});

describe("deleteHeadlineOf", () => {
  it("names a single page by its title and a single folder by its path", () => {
    expect(deleteHeadlineOf([pageRow(1, "Hello World")])).toEqual({
      key: "deleteTitlePage",
      variables: { title: "Hello World" },
    });
    expect(deleteHeadlineOf([folderRow(2, "News")])).toEqual({
      key: "deleteTitleFolder",
      variables: { path: "/news" },
    });
  });

  it("counts a selection", () => {
    expect(deleteHeadlineOf([pageRow(1, "A"), folderRow(2, "News")])).toEqual({
      key: "deleteTitleItems",
      variables: { count: 2 },
    });
  });
});

describe("isDeleteConfirmed, the typed confirm gate", () => {
  it("needs nothing when the server asked for no word", () => {
    expect(isDeleteConfirmed(null, "")).toBe(true);
  });

  it("needs the exact word, ignoring only surrounding spaces", () => {
    expect(isDeleteConfirmed("news", "")).toBe(false);
    expect(isDeleteConfirmed("news", "new")).toBe(false);
    expect(isDeleteConfirmed("news", "News")).toBe(false);
    expect(isDeleteConfirmed("news", "news")).toBe(true);
    expect(isDeleteConfirmed("news", "  news ")).toBe(true);
  });
});

describe("refusedCountOf", () => {
  it("reads the full count of a refusal, not the length of the capped list", () => {
    expect(refusedCountOf({ count: 120, items: [{}, {}], reason: "forbidden" })).toBe(120);
    expect(refusedCountOf({ count: 6, reason: "forbidden" })).toBe(6);
  });

  it("reads a refusal without a count as none", () => {
    expect(refusedCountOf({ items: [{}, {}], reason: "forbidden" })).toBe(0);
    expect(refusedCountOf({ count: "6", reason: "forbidden" })).toBe(0);
    expect(refusedCountOf(null)).toBe(0);
  });
});

describe("publishSummaryOf", () => {
  const preview = {
    folders: 3,
    pages: 37,
    skipped: [
      { collection: "posts", count: 4, reason: "live" as const },
      { collection: "pages", count: 2, reason: "unchanged" as const },
      { collection: "docs", count: 1, reason: "unchanged" as const },
    ],
  };

  it("lists collections without drafts as live and adds up what is already in the target state", () => {
    expect(publishSummaryOf(preview)).toEqual({
      liveCollections: [{ collection: "posts", count: 4 }],
      unchangedCount: 3,
    });
  });

  it("calls a run with no page to change a no-op", () => {
    expect(isPublishNoOp({ pages: 0 })).toBe(true);
    expect(isPublishNoOp({ pages: 1 })).toBe(false);
  });
});

describe("duplicateRefusalOf, the same-folder rule for a bulk copy", () => {
  const first = pageRow(1, "A", 10);
  const second = pageRow(2, "B", 10);
  const elsewhere = pageRow(3, "C", 20);

  it("refuses several items copied into the folder any of them sits in", () => {
    expect(duplicateRefusalOf([first, second], 10)).toBe("sameFolder");
    expect(duplicateRefusalOf([first, elsewhere], 20)).toBe("sameFolder");
  });

  it("allows several items into another folder, and the top level for items inside a folder", () => {
    expect(duplicateRefusalOf([first, second], 30)).toBeNull();
    expect(duplicateRefusalOf([first, second], null)).toBeNull();
  });

  it("refuses the top level when an item already sits there", () => {
    expect(duplicateRefusalOf([pageRow(4, "Top", null), first], null)).toBe("sameFolder");
  });

  it("never refuses one item, which has its own name and segment", () => {
    expect(duplicateRefusalOf([first], 10)).toBeNull();
  });

  it("counts a folder and what is inside it as one item, as the server does", () => {
    const folder = folderRow(10, "News", null);

    expect(duplicateRefusalOf([folder, pageRow(5, "Inside", 10)], null)).toBeNull();
  });
});

describe("rootsOf", () => {
  it("leaves out rows inside another selected folder", () => {
    const folder = folderRow(10, "News", null);
    const inside = pageRow(1, "Inside", 10);
    const outside = pageRow(2, "Outside", 20);

    expect(rootsOf([folder, inside, outside]).map((item) => item.id)).toEqual([10, 2]);
  });
});

describe("operation views", () => {
  const publishing: OperationView = {
    done: 400,
    id: 7,
    kind: "publish",
    status: "running",
    total: 980,
  };

  it("states the bar as a share of the work, and an empty work list as done", () => {
    expect(percentOf(publishing)).toBe(40);
    expect(percentOf({ done: 980, total: 980 })).toBe(100);
    expect(percentOf({ done: 0, total: 0 })).toBe(100);
    expect(percentOf({ done: 1, total: 3 })).toBe(33);
  });

  it("applies one answer to its own operation only", () => {
    const other: OperationView = { done: 1, id: 8, kind: "delete", status: "running", total: 5 };

    const next = withProgress([publishing, other], 7, { done: 600, status: "running", total: 980 });

    expect(next[0]).toMatchObject({ done: 600, id: 7, status: "running" });
    expect(next[1]).toBe(other);
  });

  it("keeps a failed step's error and drops it when the next answer has none", () => {
    const failed = withProgress([publishing], "7", {
      done: 400,
      error: "boom",
      status: "failed",
      total: 980,
    });
    expect(failed[0]).toMatchObject({ error: "boom", status: "failed" });
    expect(failed[0]).not.toBe(publishing);

    const resumed = withProgress(failed, 7, { done: 600, status: "running", total: 980 });
    expect(resumed[0]?.error).toBeUndefined();
  });

  it("carries the folders a delete left in place and drops them when an answer has none", () => {
    const skipped = [{ child: "Late arrival", path: "/news", reason: "notEmpty" as const }];

    const done = withProgress([publishing], 7, { done: 980, skipped, status: "done", total: 980 });
    expect(done[0]?.skipped).toEqual(skipped);

    const later = withProgress(done, 7, { done: 980, status: "done", total: 980 });
    expect(later[0]?.skipped).toBeUndefined();
  });

  it("writes one line per skipped folder, naming the child only when the server did", () => {
    const translate = ((key: string, variables?: Record<string, unknown>) =>
      `${key}:${JSON.stringify(variables)}`) as Parameters<typeof skippedLinesOf>[1];

    expect(
      skippedLinesOf(
        [
          { child: "Late arrival", path: "/news", reason: "notEmpty" },
          { child: null, path: "/blog", reason: "notEmpty" },
        ],
        translate
      )
    ).toEqual([
      'progressSkippedFolder:{"child":"Late arrival","path":"/news"}',
      'progressSkippedFolderUnnamed:{"path":"/blog"}',
    ]);
  });

  it("only a running operation has steps to take", () => {
    expect(isRunning(publishing)).toBe(true);
    expect(isRunning({ status: "failed" })).toBe(false);
    expect(isRunning({ status: "done" })).toBe(false);
  });

  it("keeps the progress this page already has for an operation a reload also found", () => {
    const found: OperationView = { ...publishing, done: 200 };
    const added: OperationView = { done: 0, id: 9, kind: "duplicate", status: "running", total: 4 };

    expect(mergeResumed([publishing], [found, added])).toEqual([publishing, added]);
  });

  it("has a banner, a title and a done message for every kind of operation", () => {
    for (const kind of [
      "delete",
      "duplicate",
      "mirrorRedirects",
      "publish",
      "unpublish",
    ] as const) {
      expect(bannerKeyOf(kind)).toMatch(/^operationBanner/u);
      expect(titleKeyOf(kind)).toMatch(/^operationTitle/u);
      expect(doneKeyOf(kind)).toMatch(/^operationDone/u);
    }
  });
});

describe("withoutOperation, what a stopped operation leaves behind", () => {
  const operation = (id: number, status: OperationView["status"]): OperationView => ({
    done: 200,
    id,
    kind: "publish",
    status,
    total: 500,
  });

  it("drops the stopped operation from the page and keeps the others, matching ids as text", () => {
    const operations = [operation(3, "failed"), operation(4, "running")];

    expect(withoutOperation(operations, "3")).toEqual([operation(4, "running")]);
    expect(withoutOperation(operations, 9)).toEqual(operations);
  });
});
