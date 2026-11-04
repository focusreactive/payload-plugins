import type { Access, Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { DeletePreview } from "../../src/core/deleteItems.js";
import type { PublishPreview } from "../../src/core/publish.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

const password = "test-password";
const reader = { email: "preview-reader@example.com", password };

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
  await harness.payload.create({
    collection: "users",
    data: { email: reader.email, password, role: "admin" } as never,
    overrideAccess: true,
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const post = <TBody>(path: string, body: unknown) =>
  callEndpoint<TBody>({
    body,
    config: harness.config,
    method: "POST",
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    user: reader,
  });

/** The reader cannot read the documents `hiddenIds` names; the collection's own read answers otherwise. */
const withHiddenFromReader = async (
  collection: "folders" | "pages",
  hiddenIds: number[],
  work: () => Promise<void>
): Promise<void> => {
  const { config } = harness.payload.collections[collection];
  const original = config.access.read;
  const hide: Access = (args) =>
    args.req.user?.email === reader.email
      ? { id: { not_in: hiddenIds } }
      : (original?.(args) ?? true);
  config.access.read = hide;
  try {
    await work();
  } finally {
    config.access.read = original;
  }
};

const createLivePage = (payload: Payload, folder: number, slug: string) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder, slug, title: slug } as never,
    depth: 0,
    overrideAccess: true,
  });

const seedBusyFolder = async (payload: Payload, slug: string) => {
  const folder = await createFolder(payload, { slug });
  const pageIds: number[] = [];
  for (let index = 1; index <= 12; index += 1) {
    pageIds.push((await createLivePage(payload, folder.id, `${slug}-${index}`)).id);
  }

  return { folder, pageIds };
};

const missingId = 987_654;

describe("the delete and publish previews", () => {
  it("answer for a folder the caller cannot read exactly as for a missing one", async () => {
    const { payload } = harness;
    const secret = await seedBusyFolder(payload, "secret");
    const open = await seedBusyFolder(payload, "open");

    await withHiddenFromReader("folders", [secret.folder.id], async () => {
      const hidden = await post<DeletePreview>("/folders-tree/delete/preview", {
        items: [{ collection: "folders", id: secret.folder.id }],
      });
      const missing = await post<DeletePreview>("/folders-tree/delete/preview", {
        items: [{ collection: "folders", id: missingId }],
      });
      const readable = await post<DeletePreview>("/folders-tree/delete/preview", {
        items: [{ collection: "folders", id: open.folder.id }],
      });

      expect(hidden.status).toBe(200);
      expect(hidden.body).toEqual(missing.body);
      expect(hidden.body.confirmWord).toBeNull();
      expect(hidden.body.pages).toBe(0);
      expect(readable.body).toMatchObject({ confirmWord: "open", folders: 1, pages: 12 });

      const hiddenPublish = await post<PublishPreview>("/folders-tree/publish", {
        action: "unpublish",
        dryRun: true,
        items: [{ collection: "folders", id: secret.folder.id }],
      });
      const missingPublish = await post<PublishPreview>("/folders-tree/publish", {
        action: "unpublish",
        dryRun: true,
        items: [{ collection: "folders", id: missingId }],
      });
      const readablePublish = await post<PublishPreview>("/folders-tree/publish", {
        action: "unpublish",
        dryRun: true,
        items: [{ collection: "folders", id: open.folder.id }],
      });

      expect(hiddenPublish.status).toBe(200);
      expect(hiddenPublish.body).toEqual(missingPublish.body);
      expect(hiddenPublish.body.pages).toBe(0);
      expect(readablePublish.body).toMatchObject({ folders: 1, pages: 12 });
    });
  });

  it("answer for a page the caller cannot read exactly as for a missing one", async () => {
    const { payload } = harness;
    const secret = await seedBusyFolder(payload, "secret");
    const [hiddenPageId] = secret.pageIds;

    await withHiddenFromReader("pages", [hiddenPageId], async () => {
      const item = { collection: "pages", id: hiddenPageId };
      const hidden = await post<DeletePreview>("/folders-tree/delete/preview", { items: [item] });
      const missing = await post<DeletePreview>("/folders-tree/delete/preview", {
        items: [{ collection: "pages", id: missingId }],
      });
      const hiddenPublish = await post<PublishPreview>("/folders-tree/publish", {
        action: "unpublish",
        dryRun: true,
        items: [item],
      });
      const missingPublish = await post<PublishPreview>("/folders-tree/publish", {
        action: "unpublish",
        dryRun: true,
        items: [{ collection: "pages", id: missingId }],
      });

      expect(hidden.body).toEqual(missing.body);
      expect(hiddenPublish.body).toEqual(missingPublish.body);
      expect(hidden.body.pages).toBe(0);
      expect(hiddenPublish.body.pages).toBe(0);
    });
  });
});
