import type { CollectionBeforeChangeHook, CollectionConfig, PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";

import { withWorkflowHooks } from "../src/hooks.js";
import type { WorkflowsSettings } from "../src/plugin.js";
import { editorialReview } from "./fixtures.js";

// A run of the editorial review sitting in "review", where "hold-publish" holds.
const inReview = {
  id: 1,
  workflow: "editorial-review",
  subjectCollection: "pages",
  subjectId: "7",
  stage: "review",
  status: "active",
  fields: {},
  activities: { review: { status: "active" } },
  fired: ["review/reset"],
  revision: 3,
  activeKey: "editorial-review:pages:7",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const settings: WorkflowsSettings = {
  workflows: [editorialReview],
  effects: {},
  roles: () => [],
  access: {},
};

const req = {
  context: {},
  payload: {
    config: { custom: { workflows: settings } },
    find: async () => ({ docs: [inReview] }),
  },
} as unknown as PayloadRequest;

const guardOf = (collection: CollectionConfig) =>
  withWorkflowHooks(collection).hooks?.beforeChange?.at(-1) as CollectionBeforeChangeHook;

const pages: CollectionConfig = { slug: "pages", versions: { drafts: true }, fields: [] };

const save = (
  collection: CollectionConfig,
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown>
) =>
  Promise.resolve(
    guardOf(collection)({
      collection: collection as never,
      context: {},
      data,
      operation: "update",
      originalDoc,
      req,
    })
  )
    .then(() => null)
    .catch((error: { status?: number; message?: string }) => error);

describe("publish guard", () => {
  it("an update without `_status` of a published document is a publish", async () => {
    // Payload usually back-fills `data._status` from the document; when it does not (e.g. while
    // restoring a version), the document's own status decides.
    expect(await save(pages, { title: "x" }, { id: 7, _status: "published" })).toMatchObject({
      status: 403,
      message: "Publishing is held until review is approved",
    });
    expect(await save(pages, { title: "x" }, { id: 7, _status: "draft" })).toBeNull();
    expect(
      await save(pages, { title: "x", _status: "draft" }, { id: 7, _status: "published" })
    ).toBeNull();
    expect(await save(pages, { _status: "published" }, { id: 7, _status: "draft" })).toMatchObject({
      status: 403,
    });
  });

  it("moving a published document to the trash is not a publish", async () => {
    expect(
      await save(pages, { deletedAt: "2026-01-02T00:00:00.000Z" }, { id: 7, _status: "published" })
    ).toBeNull();
  });
});
