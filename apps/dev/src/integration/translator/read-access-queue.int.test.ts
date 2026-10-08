import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";
import { buildTestCollections } from "./testCollections";

let ctx: TestPayload;
let allowed: Record<string, unknown>;
let refused: Record<string, unknown>;

// The deferred path is the one where nobody is watching: the request that queued the work is gone,
// and the requester is rebuilt from the stored row minutes later. Both halves are pinned elsewhere —
// that the row carries the requester, and that a rebuilt requester decides a read — but nothing
// pinned them composed.
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

const UNTOUCHED_DE = "Eigener Titel";

describe("a queued translation reads as whoever asked for it", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: withReadRule(buildTestCollections()),
      runner: createPayloadJobsRunner({ autoRun: false }),
    });
    const create = ctx.payload.create.bind(ctx.payload) as unknown as Create;
    const member = async (mayRead: boolean, email: string) => ({
      ...(await create({
        collection: "users",
        locale: "en",
        data: { email, password: "pw123456", mayRead },
      })),
      collection: "users",
    });
    allowed = await member(true, "allowed@test.dev");
    refused = await member(false, "refused@test.dev");
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  const seed = async (title: string) => {
    const create = ctx.payload.create.bind(ctx.payload) as unknown as Create;
    const created = await create({ collection: "docs", locale: "en", data: { title } });
    const id = String(created.id);
    await ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "de",
      data: { title: UNTOUCHED_DE } as never,
      draft: true,
    });
    return id;
  };

  const queueAndRunAs = async (id: string, user: Record<string, unknown>) => {
    const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      user: user as never,
      body: {
        source_lng: "en",
        target_lng: ["de"],
        collection_slug: "docs",
        collection_id: [id],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    expect(res.status).toBe(200);
    await ctx.payload.jobs.run({ queue: "translations", limit: 10 });
  };

  const germanTitle = async (id: string) =>
    (
      (await ctx.payload.findByID({
        collection: "docs" as "pages",
        id,
        locale: "de",
        draft: true,
      })) as { title?: string }
    ).title;

  it("translates nothing for a requester the source is closed to", async () => {
    const id = await seed("Closed");

    await queueAndRunAs(id, refused);

    expect(
      await germanTitle(id),
      "the job rebuilt this requester from its own row and must read as them, not as nobody"
    ).toBe(UNTOUCHED_DE);
  });

  it("still translates for a requester the source is open to", async () => {
    const id = await seed("Open");

    await queueAndRunAs(id, allowed);

    expect(await germanTitle(id), "refusing everyone deferred would pass the case above too").toBe(
      "de:Open"
    );
  });
});
