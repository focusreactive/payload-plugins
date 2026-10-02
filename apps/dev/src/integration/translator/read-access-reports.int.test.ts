import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;
let allowed: Record<string, unknown>;
let refused: Record<string, unknown>;
let docId: string;

const withReadRule = (collections: CollectionConfig[]): CollectionConfig[] =>
  collections.map((c) => {
    if (c.slug === "users") {
      return {
        ...c,
        fields: [...c.fields, { name: "mayRead", type: "checkbox" }],
      } as CollectionConfig;
    }
    if (c.slug !== "docs") return c;
    return {
      ...c,
      access: {
        read: ({ req }: { req: { user?: { mayRead?: boolean } | null } }) =>
          req.user?.mayRead === true,
      },
    } as CollectionConfig;
  });

type Create = (args: {
  collection: string;
  locale: string;
  data: Record<string, unknown>;
}) => Promise<Record<string, unknown> & { id: string | number }>;

describe("a report shows only what its caller may read", () => {
  const editToTriggerAutoTranslate = (id: string) =>
    ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "en",
      data: { title: "Editor wrote this", _status: "published" } as never,
    });

  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: withReadRule(buildTestCollections()),
      autoTranslate: { targets: ["de"] },
    });
    const create = ctx.payload.create.bind(ctx.payload) as unknown as Create;

    allowed = {
      ...(await create({
        collection: "users",
        locale: "en",
        data: { email: "allowed@test.dev", password: "pw123456", mayRead: true },
      })),
      collection: "users",
    };
    refused = {
      ...(await create({
        collection: "users",
        locale: "en",
        data: { email: "refused@test.dev", password: "pw123456", mayRead: false },
      })),
      collection: "users",
    };

    const doc = await create({
      collection: "docs",
      locale: "en",
      data: { title: "Probe", _status: "published" },
    });
    docId = String(doc.id);
    await editToTriggerAutoTranslate(docId);
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  const documentReport = (user: Record<string, unknown>) =>
    callEndpoint(ctx.payload, "get", "/translate/document/:collection_slug/:collection_id", {
      user: user as never,
      routeParams: { collection_slug: "docs", collection_id: docId },
    });

  const collectionReport = (user: Record<string, unknown>) =>
    callEndpoint(ctx.payload, "get", "/translate/collection/:collection_slug", {
      user: user as never,
      routeParams: { collection_slug: "docs" },
    });

  it("tells a caller who may not read the document nothing about it", async () => {
    const { data } = await documentReport(refused);

    expect(
      (data as { data?: unknown[] }).data,
      "the same answer as for a document that was never translated"
    ).toEqual([]);
  });

  it("keeps the document out of the collection report for that caller", async () => {
    const { data } = await collectionReport(refused);

    expect((data as { data?: { docs?: unknown[] } }).data?.docs).toEqual([]);
  });

  it('queues nothing for "translate everything" when the caller may read nothing', async () => {
    const { data } = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      user: refused as never,
      body: {
        collection_slug: "docs",
        collection_id: [docId],
        select_all: true,
        source_lng: "en",
        target_lng: ["de"],
      },
    });

    expect(
      (data as { data?: { queued?: number } }).data?.queued,
      "translating a whole collection must not reach documents the host hides, nor spend at the provider on them"
    ).toBe(0);
  });

  it("still reports to a caller the rule allows", async () => {
    const { data } = await collectionReport(allowed);

    expect(
      (data as { data?: { docs?: unknown[] } }).data?.docs?.length,
      "hiding must not be a blanket refusal"
    ).toBeGreaterThan(0);
  });
});
