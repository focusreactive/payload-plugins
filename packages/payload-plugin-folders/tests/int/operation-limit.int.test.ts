import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, createPage } from "../helpers/treeFixtures.js";

type ErrorBody = { errors: Array<{ message: string }> };

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({ foldersOptions: { limits: { maxItemsPerOperation: 2 } } });
});

afterAll(async () => {
  await harness?.destroy();
});

const post = (path: string, body: unknown) =>
  callEndpoint<ErrorBody>({
    body,
    config: harness.config,
    method: "POST",
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });

describe("limits.maxItemsPerOperation", () => {
  it("caps the items of a move, delete, duplicate and publish alike", async () => {
    const folder = await createFolder(harness.payload);
    const target = await createFolder(harness.payload);
    const items = [];
    for (const slug of ["limit-a", "limit-b", "limit-c"]) {
      const page = await createPage(harness.payload, { folder: folder.id, slug });
      items.push({ collection: "pages", id: String(page.id) });
    }

    const requests = [
      { body: { items, toFolder: String(target.id) }, path: "/folders-tree/move" },
      { body: { items }, path: "/folders-tree/delete" },
      { body: { items }, path: "/folders-tree/delete/preview" },
      { body: { items, toFolder: String(target.id) }, path: "/folders-tree/duplicate" },
      { body: { action: "publish", dryRun: true, items }, path: "/folders-tree/publish" },
    ];

    for (const { body, path } of requests) {
      const { body: answer, status } = await post(path, body);

      expect(status, `${path} ${JSON.stringify(answer)}`).toBe(400);
      expect(answer.errors[0].message, path).toContain("at most 2 items");
    }
  });
});
