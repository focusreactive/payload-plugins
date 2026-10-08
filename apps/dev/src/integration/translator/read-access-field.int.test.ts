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
}) => Promise<{ id: string | number }>;

describe("a host `read` rule decides what the plugin may translate", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      fieldSurface: true,
      collections: withReadRule(buildTestCollections()),
    });
    const create = ctx.payload.create.bind(ctx.payload) as unknown as Create;

    const yes = await create({
      collection: "users",
      locale: "en",
      data: { email: "allowed@test.dev", password: "pw123456", mayRead: true },
    });
    const no = await create({
      collection: "users",
      locale: "en",
      data: { email: "refused@test.dev", password: "pw123456", mayRead: false },
    });
    // The whole user document, not a stub: a host rule reads fields a stub does not carry.
    allowed = { ...yes, id: String(yes.id), collection: "users" };
    refused = { ...no, id: String(no.id), collection: "users" };

    const doc = await create({
      collection: "docs",
      locale: "en",
      data: { title: "Saved title", ref: "REF-1" },
    });
    docId = String(doc.id);
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  const translateTitle = (user: Record<string, unknown>) =>
    callEndpoint(ctx.payload, "post", "/translate/field", {
      user: user as never,
      body: {
        collection_slug: "docs",
        field_path: "title",
        doc_id: docId,
        source_lng: "en",
        target_lng: "de",
      },
    });

  it("hands no content to a caller the rule refuses", async () => {
    const { data } = await translateTitle(refused);

    expect(
      JSON.stringify(data),
      "the saved title must not reach a caller the host's own rule would refuse"
    ).not.toContain("Saved title");
  });

  it("still translates for a caller the rule allows", async () => {
    const { status, data } = await translateTitle(allowed);

    expect(status, "the fix must not be a blanket refusal").toBe(200);
    expect((data as { data?: { value?: unknown } }).data?.value).toBe("de:Saved title");
  });
});
