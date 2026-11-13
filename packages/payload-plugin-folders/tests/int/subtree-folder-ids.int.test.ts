import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getSubtreeFolderIds } from "../../src/server/index.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, createTestRequest } from "../helpers/treeFixtures.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

describe("getSubtreeFolderIds", () => {
  it("returns the folder and every descendant, and nothing beside them", async () => {
    const { payload } = harness;
    const root = await createFolder(payload);
    const child = await createFolder(payload, { parent: root.id });
    const grandchild = await createFolder(payload, { parent: child.id });
    const sibling = await createFolder(payload, { parent: root.id });
    const unrelated = await createFolder(payload);
    const unrelatedChild = await createFolder(payload, { parent: unrelated.id });

    const ids = await getSubtreeFolderIds(payload, { folder: root.id });

    expect(ids.toSorted((left, right) => Number(left) - Number(right))).toEqual(
      [root.id, child.id, grandchild.id, sibling.id].toSorted((left, right) => left - right)
    );
    expect(ids).not.toContain(unrelated.id);
    expect(ids).not.toContain(unrelatedChild.id);
  });

  it("returns only the folder for a leaf, and nothing for a folder that does not exist", async () => {
    const leaf = await createFolder(harness.payload);

    expect(await getSubtreeFolderIds(harness.payload, { folder: leaf.id })).toEqual([leaf.id]);
    expect(await getSubtreeFolderIds(harness.payload, { folder: 987_654 })).toEqual([]);
  });

  it("reads through a request when one is given", async () => {
    const root = await createFolder(harness.payload);
    const child = await createFolder(harness.payload, { parent: root.id });
    const request = await createTestRequest(harness.payload);

    const ids = await getSubtreeFolderIds(harness.payload, {
      folder: root.id,
      req: { ...request },
    });

    expect(ids.toSorted()).toEqual([root.id, child.id].toSorted());
  });
});
