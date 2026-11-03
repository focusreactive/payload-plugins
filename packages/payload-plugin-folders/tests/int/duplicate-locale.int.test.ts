import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { OperationProgress } from "../../src/core/operations.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder, createPage } from "../helpers/treeFixtures.js";

type FolderRow = { id: number; name: Record<string, string>; slug: Record<string, string> };

let harness: TestPayload;

beforeAll(async () => {
  // Three documents run at once; a folder and its three pages is four, so the copy is stepped.
  harness = await getTestPayload({ foldersOptions: { limits: { maxSyncDocuments: 3 } } });
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
  });

const readFolders = async (): Promise<FolderRow[]> =>
  (
    await harness.payload.db.find({
      collection: "folders",
      locale: "all",
      pagination: false,
      sort: "id",
    })
  ).docs as unknown as FolderRow[];

describe("a stepped duplicate", () => {
  it("writes the chosen name and segment in the locale of the dialog, not the default one", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { name: "Docs", slug: "docs" });
    await payload.update({
      collection: "folders",
      data: { name: "Dokumente", slug: "dokumente" },
      id: docs.id,
      locale: "de",
      overrideAccess: true,
    });
    for (const slug of ["one", "two", "three"]) {
      await createPage(payload, { folder: docs.id, slug });
    }

    const started = await post<{ operationId?: number; total?: number }>(
      "/folders-tree/duplicate?locale=de",
      {
        items: [{ collection: "folders", id: docs.id }],
        overrides: { name: "Kopie", slug: "kopie" },
      }
    );
    expect(started.body.total).toBe(4);
    const step = await post<OperationProgress>(
      `/folders-tree/operations/${started.body.operationId}/step`,
      {}
    );
    expect(step.body).toEqual({ done: 4, status: "done", total: 4 });

    const copy = (await readFolders()).find((folder) => folder.id !== docs.id) as FolderRow;
    expect(copy.name).toEqual({ de: "Kopie", en: "Docs" });
    expect(copy.slug).toEqual({ de: "kopie", en: "docs-copy" });
    const source = (await readFolders()).find((folder) => folder.id === docs.id) as FolderRow;
    expect(source.name).toEqual({ de: "Dokumente", en: "Docs" });
  });
});
