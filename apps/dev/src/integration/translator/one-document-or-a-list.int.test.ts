import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;

const tr = (locale: string, text: string) => `${locale}:${text}`;

const everyRefusalIssue = (data: unknown): string => JSON.stringify(data);

const create = async (data: Record<string, unknown>): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", ...data },
  });
  return String(made.id);
};

const editSource = (id: string, data: Record<string, unknown>) =>
  ctx.payload.update({ collection: "docs", id, locale: "en", data });

const german = async (id: string): Promise<Record<string, unknown>> =>
  (await ctx.payload.findByID({
    collection: "docs",
    id,
    locale: "de",
    fallbackLocale: false,
  })) as Record<string, unknown>;

type EnqueueBody = Record<string, unknown>;

const common = {
  source_lng: "en",
  target_lng: "de",
  collection_slug: "docs",
  publish_on_translation: true,
};

const toTheDocumentRoute = (body: EnqueueBody) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", { body: { ...common, ...body } });

const toTheListRoute = (body: EnqueueBody) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue-list", { body: { ...common, ...body } });

const leaves = (...addresses: string[]) => [{ kind: "leaves", addresses }];
const stale = [{ kind: "rule", name: "stale" }];

beforeAll(async () => {
  ctx = await bootTestPayload();
});

afterAll(async () => {
  await ctx?.cleanup();
});

describe("the route that takes one document", () => {
  it("translates the addresses it was given and leaves every sibling alone", async () => {
    const id = await create({ title: "A title", note: "A note" });

    const response = await toTheDocumentRoute({ collection_id: [id], filters: leaves("title") });

    expect(response.status).toBe(200);
    const de = await german(id);
    expect(
      { title: de.title, note: de.note },
      "an untranslated leaf is filled from the source on assembly, which is what untouched means here"
    ).toStrictEqual({ title: tr("de", "A title"), note: "A note" });
  });

  it("refuses a body naming more than one document", async () => {
    const first = await create({ title: "First" });
    const second = await create({ title: "Second" });

    const response = await toTheDocumentRoute({
      collection_id: [first, second],
      filters: leaves("title"),
    });

    expect(response.status).toBe(400);
    expect(everyRefusalIssue(response.data)).toContain("one document");
  });
});

describe("the route that takes a list of documents", () => {
  it("narrows every document in the list by the rule, each on its own", async () => {
    const moved = await create({ title: "Moved", note: "Steady" });
    const still = await create({ title: "Still", note: "Steady" });
    await toTheListRoute({ collection_id: [moved, still] });

    await editSource(moved, { title: "Moved, edited" });
    await ctx.payload.update({
      collection: "docs",
      id: still,
      locale: "de",
      data: { _status: "published", title: "HAND-WRITTEN" },
    });

    const response = await toTheListRoute({ collection_id: [moved, still], filters: stale });

    expect(response.status).toBe(200);
    expect((await german(moved)).title, "its source moved, so it is refreshed").toBe(
      tr("de", "Moved, edited")
    );
    expect((await german(still)).title, "its source never moved, so the hand edit survives").toBe(
      "HAND-WRITTEN"
    );
  });

  it("refuses a body carrying leaf addresses", async () => {
    const id = await create({ title: "Addressed" });

    const response = await toTheListRoute({ collection_id: [id], filters: leaves("title") });

    expect(response.status).toBe(400);
    expect(everyRefusalIssue(response.data)).toContain("address");
  });
});
