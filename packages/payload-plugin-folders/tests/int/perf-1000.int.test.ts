import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PathChange } from "../../src/types.js";
import { countDbCalls } from "../helpers/countDbCalls.js";
import { countDbWrites } from "../helpers/countDbWrites.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { seedTree } from "../helpers/seedTree.js";
import type { SeededTree } from "../helpers/seedTree.js";

// Spec section 5.5: rename the segment of a folder holding 20 subfolders and 980 pages. The 2,000 ms
// budget is the SQLite one; Postgres records its time and is not held to it.
const sqliteBudgetMs = 2000;

const reported: Array<{ changes: PathChange[]; reason: string }> = [];

let harness: TestPayload;
let tree: SeededTree;

beforeAll(async () => {
  harness = await getTestPayload({
    foldersOptions: {
      hooks: {
        afterPathChange: ({ changes, reason }) => {
          reported.push({ changes, reason });
        },
      },
    },
  });
  tree = await seedTree(harness.payload, { large: true });
});

afterAll(async () => {
  await harness?.destroy();
});

const pageCollections = new Set(["pages", "posts"]);

describe("renaming a folder with 1,000 descendants", () => {
  it("the callback receives 980 page changes", async () => {
    const { payload } = harness;
    reported.length = 0;

    // de has no slug of its own yet, so renaming in de moves only the de paths.
    await payload.update({
      collection: "folders",
      data: { name: "Ueber uns", slug: "ueber-uns" },
      depth: 0,
      id: tree.about.id,
      locale: "de",
      overrideAccess: true,
    });

    expect(reported).toHaveLength(1);
    expect(reported[0].reason).toBe("folderUpdate");
    const pages = reported[0].changes.filter((change) => change.kind === "page");
    expect(pages).toHaveLength(980);
    expect(new Set(pages.map((change) => change.locale))).toEqual(new Set(["de"]));
    expect(new Set(pages.map((change) => change.id)).size).toBe(980);
    for (const change of pages) {
      expect(change.from).toMatch(/^\/about\/section-\d{2}\//u);
      expect(change.to).toMatch(/^\/ueber-uns\/section-\d{2}\//u);
      expect(change.published).toBe(true);
    }
    const folders = reported[0].changes.filter((change) => change.kind === "folder");
    expect(folders).toHaveLength(21);
  });

  it("the 1,000-descendant rename finishes under 2,000 ms on SQLite and writes no page rows", async () => {
    const { databaseKind, payload } = harness;
    reported.length = 0;

    const startedAt = performance.now();
    const { result: reads, writes } = await countDbWrites(payload, () =>
      countDbCalls(payload, () =>
        payload.update({
          collection: "folders",
          data: { name: "Company", slug: "company" },
          depth: 0,
          id: tree.about.id,
          overrideAccess: true,
        })
      )
    );
    const elapsedMs = performance.now() - startedAt;
    // Recorded for the build log; Postgres is not held to the SQLite budget.
    console.info(
      `[perf-1000] rename of 1,000 descendants took ${Math.round(elapsedMs)} ms on ${databaseKind}`
    );

    expect(writes.filter((write) => pageCollections.has(write.collection))).toEqual([]);
    // 20 subfolders, each one row; the folder itself is saved once and completed once.
    const subfolderWrites = writes.filter(
      (write) =>
        write.collection === "folders" &&
        write.method === "updateOne" &&
        tree.subfolders.some((folder) => folder.id === write.id)
    );
    expect(subfolderWrites).toHaveLength(20);
    // One list of pages per page collection, not one read per page.
    expect(
      reads.calls.filter((call) => pageCollections.has(call.collection) && call.method === "find")
    ).toHaveLength(2);

    expect(reported).toHaveLength(1);
    // Whatever the de state is, every page moves in en.
    expect(
      reported[0].changes.filter((change) => change.kind === "page" && change.locale === "en")
    ).toHaveLength(980);

    if (databaseKind === "sqlite") {
      expect(elapsedMs).toBeLessThan(sqliteBudgetMs);
    }
  });
});
