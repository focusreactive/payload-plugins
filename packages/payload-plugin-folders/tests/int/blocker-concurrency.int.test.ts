import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { MoveBlockedError } from "../../src/core/move.js";
import { seedTreeState } from "../../src/core/treeLock.js";
import { moveItems } from "../../src/server/index.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder, createPage } from "../helpers/treeFixtures.js";

/**
 * Blocker 2 (spec sections 5.2 and 6): structural writers that run at the same time. The tests
 * assert outcomes (who won, what the tree looks like), never an order of interleaving, because
 * which of two parallel writers goes first is not defined.
 */

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const folderRef = (id: number) => ({ collection: "folders", id });
const pageRef = (id: number) => ({ collection: "pages", id });

type FolderRow = { ancestorIds: string; id: number; parent: number | { id: number } | null };

const listFolders = async (payload: Payload): Promise<FolderRow[]> => {
  const { docs } = await payload.find({
    collection: "folders",
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
  });

  return docs as unknown as FolderRow[];
};

const parentIdOf = (row: FolderRow): number | null =>
  row.parent === null ? null : typeof row.parent === "object" ? row.parent.id : row.parent;

/**
 * Every folder reaches the root through its parents without a loop, and its stored `ancestorIds`
 * names exactly that chain. A cycle would leave a folder that never reaches the root.
 */
const expectEveryFolderReachesRoot = async (payload: Payload): Promise<void> => {
  const rows = await listFolders(payload);
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  for (const row of rows) {
    const chain: number[] = [];
    let current: FolderRow | undefined = row;
    while (current) {
      expect(chain).not.toContain(current.id);
      chain.unshift(current.id);
      const parentId = parentIdOf(current);
      if (parentId === null) {
        current = undefined;
      } else {
        current = rowsById.get(parentId);
        expect(current, `parent ${parentId} of folder ${row.id} exists`).toBeDefined();
      }
    }
    const ancestors = chain.slice(0, -1);
    expect(row.ancestorIds).toBe(ancestors.length === 0 ? "/" : `/${ancestors.join("/")}/`);
  }
};

const settledError = (result: PromiseSettledResult<unknown>): MoveBlockedError => {
  expect(result.status).toBe("rejected");

  return (result as PromiseRejectedResult).reason as MoveBlockedError;
};

type CrossedMoves = {
  first: PromiseSettledResult<unknown>;
  second: PromiseSettledResult<unknown>;
  x: { id: number };
  y: { id: number };
};

/** X into Y and Y into X, both started in the same tick through `moveItems`. */
const runCrossedMoves = async (
  payload: Payload,
  { sendExpected = false, secondPayload = payload } = {}
): Promise<CrossedMoves> => {
  const x = await createFolder(payload, { slug: "x" });
  const y = await createFolder(payload, { slug: "y" });
  const expected = { orderKey: null, parentId: null };
  const [first, second] = await Promise.allSettled([
    moveItems(payload, {
      items: [
        {
          ...folderRef(x.id),
          ...(sendExpected ? { expected: { ...expected, orderKey: x.orderKey as string } } : {}),
        },
      ],
      toFolder: y.id,
    }),
    moveItems(secondPayload, {
      items: [
        {
          ...folderRef(y.id),
          ...(sendExpected ? { expected: { ...expected, orderKey: y.orderKey as string } } : {}),
        },
      ],
      toFolder: x.id,
    }),
  ]);

  return { first, second, x, y };
};

const expectExactlyOneApplied = ({ first, second }: CrossedMoves): MoveBlockedError => {
  const statuses = [first.status, second.status].sort();
  expect(statuses).toEqual(["fulfilled", "rejected"]);

  return settledError(first.status === "rejected" ? first : second);
};

describe("crossed folder moves", () => {
  it("crossed folder moves X into Y and Y into X in parallel apply exactly one", async () => {
    const { payload } = harness;
    // Several rounds, because one run can happen to line up the same way every time.
    for (let round = 0; round < 5; round += 1) {
      const result = await runCrossedMoves(payload);
      expectExactlyOneApplied(result);

      const rows = await listFolders(payload);
      const rowsById = new Map(rows.map((row) => [row.id, row]));
      const xParent = parentIdOf(rowsById.get(result.x.id) as FolderRow);
      const yParent = parentIdOf(rowsById.get(result.y.id) as FolderRow);
      // Exactly one of the two moves landed: one folder is inside the other, never both.
      expect([xParent === result.y.id, yParent === result.x.id].filter(Boolean)).toHaveLength(1);

      await clearTree(payload);
    }
  });

  it("the other returns 400 cycle or 409 stale", async () => {
    const { payload } = harness;
    const withoutExpected = expectExactlyOneApplied(await runCrossedMoves(payload));
    await clearTree(payload);
    const withExpected = expectExactlyOneApplied(
      await runCrossedMoves(payload, { sendExpected: true })
    );

    for (const error of [withoutExpected, withExpected]) {
      expect(error.name).toBe("MoveBlockedError");
      const [block] = error.blocked;
      expect(
        (error.status === 400 && block.reason === "cycle") ||
          (error.status === 409 && block.reason === "stale")
      ).toBe(true);
    }
  });

  it("every folder still reaches the root afterwards", async () => {
    const { payload } = harness;
    // A small tree around the crossing pair, so ancestorIds of descendants are checked too.
    const base = await createFolder(payload, { slug: "base" });
    const baseChild = await createFolder(payload, { parent: base.id, slug: "base-child" });
    await createFolder(payload, { parent: baseChild.id, slug: "base-grandchild" });

    const result = await runCrossedMoves(payload);
    expectExactlyOneApplied(result);
    // A third move runs on whatever tree the crossing left.
    await moveItems(payload, { items: [folderRef(base.id)], toFolder: result.x.id }).catch(
      (error: unknown) => {
        expect(error).toBeInstanceOf(MoveBlockedError);
      }
    );

    await expectEveryFolderReachesRoot(payload);
  });

  it.skipIf(process.env.TEST_DB !== "postgres")(
    "crossed moves from two server instances on one database apply exactly one",
    async () => {
      const second = await getTestPayload({ sharedWith: harness });
      try {
        for (let round = 0; round < 3; round += 1) {
          const result = await runCrossedMoves(harness.payload, { secondPayload: second.payload });
          const error = expectExactlyOneApplied(result);
          expect([400, 409]).toContain(error.status);
          await expectEveryFolderReachesRoot(harness.payload);
          await clearTree(harness.payload);
        }
      } finally {
        await second.destroy();
      }
    }
  );
});

describe("parallel writers into one folder", () => {
  it("50 parallel page creates in one folder get 50 distinct keys", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "crowded" });

    const pages = await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        createPage(payload, { folder: folder.id, slug: `page-${index}` })
      )
    );

    const keys = pages.map((page) => page.orderKey as string);
    expect(keys.every((key) => typeof key === "string" && key.length > 0)).toBe(true);
    expect(new Set(keys)).toHaveLength(50);
    const { docs } = await payload.find({
      collection: "pages",
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      sort: "orderKey",
      where: { folder: { equals: folder.id } },
    });
    expect(docs).toHaveLength(50);
    expect(new Set(docs.map((doc) => doc.orderKey))).toHaveLength(50);
  });

  it("a move with an outdated expected orderKey returns 409", async () => {
    const { payload } = harness;
    const source = await createFolder(payload, { slug: "source" });
    const target = await createFolder(payload, { slug: "target" });
    const page = await createPage(payload, { folder: source.id, slug: "page" });
    const storedKey = page.orderKey as string;

    const outdatedKey = await moveItems(payload, {
      items: [{ ...pageRef(page.id), expected: { orderKey: "zzzz", parentId: source.id } }],
      toFolder: target.id,
    }).catch((error: unknown) => error as MoveBlockedError);
    const outdatedParent = await moveItems(payload, {
      items: [{ ...pageRef(page.id), expected: { orderKey: storedKey, parentId: target.id } }],
      toFolder: target.id,
    }).catch((error: unknown) => error as MoveBlockedError);

    for (const error of [outdatedKey, outdatedParent]) {
      expect(error).toBeInstanceOf(MoveBlockedError);
      expect((error as MoveBlockedError).status).toBe(409);
      expect((error as MoveBlockedError).blocked[0].reason).toBe("stale");
      expect((error as MoveBlockedError).message).toBe(
        "This part of the tree changed. Reload and try again."
      );
    }
    const stored = (await payload.findByID({
      collection: "pages",
      depth: 0,
      id: page.id,
      overrideAccess: true,
    })) as unknown as { folder: number; orderKey: string };
    expect(stored).toMatchObject({ folder: source.id, orderKey: storedKey });

    // The current state is accepted.
    await moveItems(payload, {
      items: [{ ...pageRef(page.id), expected: { orderKey: storedKey, parentId: source.id } }],
      toFolder: target.id,
    });
  });

  const expectBothLandBetween = async (
    payload: Payload,
    folderId: number,
    ids: { above: number; below: number; moved: number[] }
  ): Promise<void> => {
    const { docs } = await payload.find({
      collection: "pages",
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      sort: "orderKey",
      where: { folder: { equals: folderId } },
    });
    const order = docs.map((doc) => doc.id);
    expect(order).toHaveLength(2 + ids.moved.length);
    expect(order[0]).toBe(ids.above);
    expect(order.at(-1)).toBe(ids.below);
    expect(order.slice(1, -1).sort()).toEqual([...ids.moved].sort());
    const keys = docs.map((doc) => doc.orderKey as string);
    expect(new Set(keys)).toHaveLength(keys.length);
    expect(keys).toEqual([...keys].sort());
  };

  it("two parallel moves into one gap both land in a valid order", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "gap" });
    // New items go on top, so create the bottom page first.
    const below = await createPage(payload, { folder: folder.id, slug: "below" });
    const above = await createPage(payload, { folder: folder.id, slug: "above" });
    const [first, second] = await Promise.all([
      createPage(payload, { slug: "first" }),
      createPage(payload, { slug: "second" }),
    ]);

    await Promise.all([
      moveItems(payload, { after: pageRef(above.id), items: [pageRef(first.id)] }),
      moveItems(payload, { after: pageRef(above.id), items: [pageRef(second.id)] }),
    ]);

    await expectBothLandBetween(payload, folder.id, {
      above: above.id,
      below: below.id,
      moved: [first.id, second.id],
    });
  });

  it("two parallel moves into a gap whose lower neighbour has no key rebalance and both land in a valid order", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "keyless-gap" });
    const below = await createPage(payload, { folder: folder.id, slug: "below" });
    const above = await createPage(payload, { folder: folder.id, slug: "above" });
    // A row without a key sorts last, so the gap after `above` has a neighbour that cannot take an
    // insert between them: the move has to repair the keys first, once, under the lock.
    await payload.db.updateOne({
      collection: "pages",
      data: { orderKey: null, updatedAt: new Date().toISOString() },
      id: below.id,
      returning: false,
    });
    const [first, second] = await Promise.all([
      createPage(payload, { slug: "first" }),
      createPage(payload, { slug: "second" }),
    ]);

    await Promise.all([
      moveItems(payload, { after: pageRef(above.id), items: [pageRef(first.id)] }),
      moveItems(payload, { after: pageRef(above.id), items: [pageRef(second.id)] }),
    ]);

    await expectBothLandBetween(payload, folder.id, {
      above: above.id,
      below: below.id,
      moved: [first.id, second.id],
    });
  });
});

const countRowsDirectly = async (payload: Payload): Promise<number> => {
  const database = payload.db as unknown as {
    drizzle: { select: () => { from: (table: unknown) => Promise<unknown[]> } };
    tables: Record<string, unknown>;
  };

  return (await database.drizzle.select().from(database.tables.folders_tree_state)).length;
};

const deleteTreeStateRows = async (payload: Payload): Promise<void> => {
  const database = payload.db as unknown as {
    drizzle: { delete: (table: unknown) => Promise<unknown> };
    tables: Record<string, unknown>;
  };
  await database.drizzle.delete(database.tables.folders_tree_state);
};

describe("the tree-state row", () => {
  it("seedTreeState leaves one row when many inits race on an empty database", async () => {
    const { payload } = harness;
    await deleteTreeStateRows(payload);
    expect(await countRowsDirectly(payload)).toBe(0);

    await Promise.all(Array.from({ length: 8 }, () => seedTreeState(payload)));

    expect(await countRowsDirectly(payload)).toBe(1);
    // The row is the one the lock and the revision use.
    const row = (await payload.db.findGlobal({ slug: "folders-tree-state" as never })) as {
      revision?: number;
    };
    expect(row.revision).toBe(0);
  });

  it.skipIf(process.env.TEST_DB !== "postgres")(
    "two server instances seeding an empty database at once leave one row",
    async () => {
      const second = await getTestPayload({ sharedWith: harness });
      try {
        for (let round = 0; round < 3; round += 1) {
          await deleteTreeStateRows(harness.payload);

          await Promise.all([
            seedTreeState(harness.payload),
            seedTreeState(second.payload),
            seedTreeState(harness.payload),
            seedTreeState(second.payload),
          ]);

          expect(await countRowsDirectly(harness.payload)).toBe(1);
        }
      } finally {
        await second.destroy();
      }
    }
  );

  it("seedTreeState leaves an existing row alone, whatever its id", async () => {
    const { payload } = harness;
    await deleteTreeStateRows(payload);
    await payload.db.createGlobal({
      data: { revision: 7 },
      returning: false,
      slug: "folders-tree-state" as never,
    });

    await seedTreeState(payload);

    expect(await countRowsDirectly(payload)).toBe(1);
    const row = (await payload.db.findGlobal({ slug: "folders-tree-state" as never })) as {
      revision?: number;
    };
    expect(row.revision).toBe(7);
  });
});
