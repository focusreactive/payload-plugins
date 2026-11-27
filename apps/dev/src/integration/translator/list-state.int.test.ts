import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Run = { status: string; locales: string[]; failedLocale?: string; message?: string } | null;
type Row = {
  id: string;
  locales: { locale: string; content: { kind: string; translatedAt?: string | null }; run: Run }[];
};
type ListState = { collection: string; docs: Row[] };

const ATTEMPTS = 2;
const PASSES_UNTIL_THE_RUN_GIVES_UP = ATTEMPTS + 1;

const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true },
    { name: "owner", type: "text" },
  ],
  access: { read: ({ req }) => (req.user ? { owner: { not_equals: "hidden" } } : true) },
};

const list = async (ctx: TestPayload, ids: string[], user?: { id: string; collection: string }) => {
  const res = await callEndpoint(ctx.payload, "get", "/translate/list-state/:collection_slug", {
    routeParams: { collection_slug: "docs" },
    query: `ids=${ids.join(",")}`,
    ...(user ? { user } : {}),
  });
  return { status: res.status, state: (res.data as { data: ListState }).data };
};

const localeOf = (row: Row | undefined, locale: string) =>
  row?.locales.find((one) => one.locale === locale);

describe("a page of list rows", () => {
  let ctx: TestPayload;
  let ids: string[];
  let reader: { id: string; collection: string };

  beforeAll(async () => {
    ctx = await bootTestPayload({ collections: [docs] });
    const user = await ctx.payload.create({
      collection: "users" as "docs",
      data: { email: "reader@test.dev", password: "pw123456" } as never,
    });
    reader = { id: String((user as { id: string | number }).id), collection: "users" };
    const made = await Promise.all(
      ["One", "Two", "Three"].map(async (title) =>
        ctx.payload.create({ collection: "docs", locale: "en", data: { title, owner: "anyone" } })
      )
    );
    ids = made.map((doc) => String(doc.id));

    await ctx.payload.update({
      collection: "docs",
      id: ids[1] as string,
      locale: "de",
      data: { title: "Zwei von Hand" },
    });
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("answers about the ids it was asked for, in the order asked", async () => {
    const asked = [ids[2], ids[0]] as string[];

    const { status, state } = await list(ctx, asked);

    expect(status).toBe(200);
    expect(state.collection).toBe("docs");
    expect(state.docs.map((row) => row.id)).toStrictEqual(asked);
  });

  it("says empty for a locale that holds nothing and filled for one that does", async () => {
    const { state } = await list(ctx, ids);

    expect(localeOf(state.docs[0], "de")?.content).toStrictEqual({ kind: "empty" });
    expect(localeOf(state.docs[1], "de")?.content).toStrictEqual({
      kind: "filled",
      translatedAt: null,
    });
  });

  it("names when a run last wrote a locale it translated", async () => {
    const queued = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: "fr",
        collection_slug: "docs",
        collection_id: [ids[0]],
      },
    });
    expect(queued.status).toBe(200);

    const { state } = await list(ctx, ids);
    const french = localeOf(state.docs[0], "fr");

    expect(french?.content.kind).toBe("filled");
    expect(typeof french?.content.translatedAt).toBe("string");
  });

  it("leaves out a document the caller may not read, and answers about the rest", async () => {
    const hidden = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { title: "Hidden", owner: "hidden" },
    });

    const { status, state } = await list(ctx, [String(hidden.id), ids[0] as string], reader);

    expect(status).toBe(200);
    expect(state.docs.map((row) => row.id)).toStrictEqual([ids[0]]);
  });
});
