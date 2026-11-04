import type { Access, Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { OperationProgress } from "../../src/core/operations.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

/**
 * A queued delete stores its work list when it starts. Content another editor adds to a folder
 * after that is not on the list and was never confirmed, so the step that reaches the folder leaves
 * the folder and the new content alone and reports the folder, instead of answering 409 on every
 * retry.
 */

type StartBody = { operationId?: number; total?: number };

const password = "test-password";
const editor = { email: "new-content-editor@example.com", password };

let harness: TestPayload;

beforeAll(async () => {
  // Three documents run at once; a folder with four pages is more, so the delete is queued.
  harness = await getTestPayload({ foldersOptions: { limits: { maxSyncDocuments: 3 } } });
  await harness.payload.create({
    collection: "users",
    data: { email: editor.email, password, role: "editor" } as never,
    overrideAccess: true,
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const call = <TBody>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  user?: { email: string; password: string }
) =>
  callEndpoint<TBody>({
    body,
    config: harness.config,
    method,
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    ...(user ? { user } : {}),
  });

const createPageIn = async (payload: Payload, folder: number, slug: string, title = slug) =>
  (await payload.create({
    collection: "pages",
    data: { _status: "published", folder, slug, title } as never,
    depth: 0,
    overrideAccess: true,
  })) as unknown as { id: number };

const seedFolderWithPages = async (payload: Payload, slug: string) => {
  const folder = await createFolder(payload, { slug });
  for (let index = 1; index <= 4; index += 1) {
    await createPageIn(payload, folder.id, `${slug}-${index}`);
  }

  return folder;
};

const countAll = async (payload: Payload, collection: "folders" | "pages") =>
  (await payload.db.count({ collection, where: { id: { exists: true } } })).totalDocs;

const startDelete = async (folderId: number, user?: { email: string; password: string }) => {
  const started = await call<StartBody>(
    "POST",
    "/folders-tree/delete",
    { items: [{ collection: "folders", id: folderId }] },
    user
  );
  expect(started.body.operationId).toBeDefined();

  return started.body.operationId as number;
};

const step = (operationId: number, user?: { email: string; password: string }) =>
  call<OperationProgress>("POST", `/folders-tree/operations/${operationId}/step`, undefined, user);

describe("a queued delete of a folder that gained a page after it started", () => {
  it("finishes, leaves the folder and the new page, and names the folder it skipped", async () => {
    const { payload } = harness;
    const folder = await seedFolderWithPages(payload, "bulk");
    const operationId = await startDelete(folder.id);
    await createPageIn(payload, folder.id, "late-arrival", "Late arrival");

    const { body, status } = await step(operationId);

    expect(status).toBe(200);
    expect(body).toEqual({
      done: 5,
      skipped: [{ child: "Late arrival", path: "/bulk", reason: "notEmpty" }],
      status: "done",
      total: 5,
    });
    expect(await countAll(payload, "pages")).toBe(1);
    expect(await countAll(payload, "folders")).toBe(1);
    expect((await step(operationId)).body).toEqual(body);
  });

  it("does not name a new page the user may not read", async () => {
    const { payload } = harness;
    const folder = await seedFolderWithPages(payload, "bulk");
    const operationId = await startDelete(folder.id, editor);
    const secret = await createPageIn(payload, folder.id, "secret", "Secret plans");
    const { config } = payload.collections.pages;
    const original = config.access.read;
    const hideSecret: Access = ({ req }) =>
      req.user?.email === editor.email ? { id: { not_in: [secret.id] } } : true;
    config.access.read = hideSecret;
    try {
      const { body } = await step(operationId, editor);

      expect(body).toMatchObject({
        skipped: [{ child: "a page", path: "/bulk", reason: "notEmpty" }],
        status: "done",
      });
      expect(JSON.stringify(body)).not.toContain("Secret plans");
    } finally {
      config.access.read = original;
    }
  });

  it("skips a folder that gained a subfolder", async () => {
    const { payload } = harness;
    const outer = await seedFolderWithPages(payload, "outer");
    const operationId = await startDelete(outer.id);
    await createFolder(payload, { parent: outer.id, slug: "late-subfolder" });

    const { body } = await step(operationId);

    expect(body).toMatchObject({ done: 5, status: "done", total: 5 });
    expect(await countAll(payload, "pages")).toBe(0);
    expect(await countAll(payload, "folders")).toBe(2);
  });
});
