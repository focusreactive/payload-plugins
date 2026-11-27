import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Leaf = { kind: "leaf"; label: string; address: string; required: boolean };
type Node =
  | Leaf
  | { kind: "group"; label: string; children: Node[] }
  | {
      kind: "whole-list";
      label: string;
      addresses: string[];
    };
type Content =
  | { kind: "empty" }
  | { kind: "untracked" }
  | { kind: "filled" }
  | { kind: "tracked"; verdicts: Record<string, string>; translatedAt: string };
type State = {
  collection: string;
  sourceLocale: string;
  tree: Node[];
  excluded: string[];
  locales: { locale: string; content: Content; run: { status: string } | null }[];
};

const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "summary", type: "text", localized: true, label: { en: "Summary", de: "Kurzfassung" } },
    {
      name: "secret",
      type: "text",
      localized: true,
      access: { read: () => false },
    },
    {
      name: "slug",
      type: "text",
      localized: true,
      custom: { translateKit: { exclude: true } },
    },
  ],
};

const addressesOf = (nodes: readonly Node[]): string[] =>
  nodes.flatMap((node) => {
    if (node.kind === "group") return addressesOf(node.children);
    if (node.kind === "whole-list") return node.addresses;
    return [node.address];
  });

const read = async (ctx: TestPayload, id: string, language?: string) => {
  const res = await callEndpoint(
    ctx.payload,
    "get",
    "/translate/document-state/:collection_slug/:collection_id",
    {
      routeParams: { collection_slug: "docs", collection_id: id },
      ...(language ? { language } : {}),
    }
  );
  return { status: res.status, state: (res.data as { data: State }).data };
};

describe("the document state of a document only its source locale holds", () => {
  let ctx: TestPayload;
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload({ collections: [docs] });
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { title: "An English title", summary: "An English summary", slug: "english-title" },
    });
    id = String(made.id);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("names the source locale and the fields nothing translates", async () => {
    const { status, state } = await read(ctx, id);

    expect(status).toBe(200);
    expect(state.sourceLocale).toBe("en");
    expect(state.excluded).toStrictEqual(["Slug"]);
  });

  it("offers the leaves the source holds, with the collection's labels and required flags", async () => {
    const { state } = await read(ctx, id);

    expect(state.tree).toStrictEqual([
      { kind: "leaf", label: "Title", address: "title", required: true },
      { kind: "leaf", label: "Summary", address: "summary", required: false },
    ]);
  });

  it("reads a field label in the language the admin is in", async () => {
    const { state } = await read(ctx, id, "de");

    expect((state.tree[1] as Leaf).label).toBe("Kurzfassung");
  });

  it("offers no node for a field the caller may not read, nor for the excluded one", async () => {
    const { state } = await read(ctx, id);

    expect(addressesOf(state.tree)).not.toContain("secret");
    expect(addressesOf(state.tree)).not.toContain("slug");
  });

  it("reads every target locale as empty, since none of them holds anything", async () => {
    const { state } = await read(ctx, id);

    expect(state.locales.map((one) => [one.locale, one.content.kind])).toStrictEqual([
      ["de", "empty"],
      ["fr", "empty"],
      ["es", "empty"],
    ]);
  });

  it("reads a locale written by hand as written by hand, and a translated one as tracked", async () => {
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "fr",
      data: { title: "Un titre écrit à la main" },
    });
    const queued = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: "de",
        collection_slug: "docs",
        collection_id: [id],
      },
    });
    expect(queued.status).toBe(200);

    const { state } = await read(ctx, id);
    const byLocale = new Map(state.locales.map((one) => [one.locale, one.content]));

    expect(byLocale.get("fr")?.kind).toBe("untracked");
    const german = byLocale.get("de") as Extract<Content, { kind: "tracked" }>;
    expect(german.kind).toBe("tracked");
    expect(german.verdicts).toStrictEqual({ title: "current", summary: "current" });
    expect(Object.keys(german.verdicts)).not.toContain("secret");
  });

  it("answers 404 for a document that is not there", async () => {
    const { status } = await read(ctx, "404404404404404404404404");

    expect(status).toBe(404);
  });
});
