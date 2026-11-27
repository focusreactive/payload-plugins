import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "note", type: "text", localized: true },
  ],
};

let ctx: TestPayload;
let id: string;

const translate = async (addresses: string[]) =>
  await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: "docs",
      collection_id: [id],
      filters: [{ kind: "leaves", addresses }],
    },
  });

const german = async () =>
  (await ctx.payload.findByID({
    collection: "docs",
    id,
    locale: "de",
    fallbackLocale: false,
    depth: 0,
  })) as unknown as { title?: string; note?: string };

beforeAll(async () => {
  ctx = await bootTestPayload({ collections: [docs] });
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { title: "An English title", note: "An English note" },
  });
  id = String(made.id);
});

afterAll(async () => {
  await ctx?.cleanup();
});

describe("naming fields for a locale that holds nothing", () => {
  it("is refused, and nothing is written", async () => {
    const response = await translate(["note"]);

    expect(response.status).toBe(400);
    expect((response.data as { message: string }).message).toContain(
      "Nothing is written yet in de"
    );
    expect(await german()).toMatchObject({ title: undefined, note: undefined });
  });
});

describe("naming fields for a locale written by hand", () => {
  beforeAll(async () => {
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { title: "Ein Titel von Hand", note: "Eine Notiz von Hand" },
    });
  });

  it("is accepted, writes the named field and leaves the rest as it was", async () => {
    const response = await translate(["note"]);

    expect(response.status).toBe(200);
    expect(await german()).toMatchObject({
      title: "Ein Titel von Hand",
      note: "de:An English note",
    });
  });
});
