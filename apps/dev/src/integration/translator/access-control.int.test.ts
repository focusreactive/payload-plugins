import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

let ctx: TestPayload;
let editor: { id: string; collection: string };

// `title` refuses every field write; `tagline` has no rule. Two fields, so a run can show the
// difference between "the denied field was left alone" and "the whole translation was refused" —
// which a single-field fixture cannot.
const withFieldRule = (collections: CollectionConfig[]): CollectionConfig[] =>
  collections.map((c) => {
    if (c.slug !== "docs") return c;
    return {
      ...c,
      fields: [
        ...c.fields.map((f) =>
          "name" in f && f.name === "title" ? { ...f, access: { update: () => false } } : f
        ),
        { name: "tagline", type: "text", localized: true },
      ],
    } as CollectionConfig;
  });

const germanDoc = async (id: string) =>
  (await ctx.payload.findByID({
    collection: "docs" as "pages",
    id,
    locale: "de",
    // Without publish-on-translation the write lands in the draft layer.
    draft: true,
  })) as { title?: string; tagline?: string };

describe("a field rule is honoured, and only that field is affected", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: withFieldRule(buildTestCollections()),
      autoTranslate: { targets: ["de"] },
    });
    // A real row, not a literal: the permission check looks the requester up, and an id that
    // resolves to nothing would make every case here pass for the wrong reason.
    const user = await ctx.payload.create({
      collection: "users" as "pages",
      data: { email: "editor@test.dev", password: "pw123456" } as never,
    });
    editor = { id: String((user as { id: string | number }).id), collection: "users" };
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  const seed = async (title: string, tagline: string) => {
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title, tagline } as never,
      user: editor as never,
    });
    const id = String(created.id);
    // Give the target locale its own values first, so "left alone" is distinguishable from "blank".
    await ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "de",
      data: { title: "Eigener Titel", tagline: "Eigene Zeile" } as never,
      draft: true,
    });
    return id;
  };

  const publishEdit = (id: string, title: string, tagline: string) =>
    ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "en",
      data: { title, tagline, _status: "published" } as never,
      user: editor as never,
    });

  it("field rule — the denied field keeps the value it already had", async () => {
    const id = await seed("Hello", "Free for all");

    await publishEdit(id, "Hello again", "Now edited");

    expect((await germanDoc(id)).title).toBe("Eigener Titel");
  });

  it("field rule — its sibling is translated all the same", async () => {
    const id = await seed("Second", "Second line");

    await publishEdit(id, "Second edited", "Second line edited");

    expect((await germanDoc(id)).tagline).toBe("de:Second line edited");
  });

  it("save survives — the editor's own write is untouched by the refusal", async () => {
    const id = await seed("Third", "Third line");

    await publishEdit(id, "Editor wrote this", "And this");

    const en = (await ctx.payload.findByID({
      collection: "docs" as "pages",
      id,
      locale: "en",
      draft: true,
    })) as { title?: string };
    expect(en.title).toBe("Editor wrote this");
  });
});
