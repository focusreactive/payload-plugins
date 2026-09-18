import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig, PayloadRequest } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

let ctx: TestPayload;
let editor: { id: string; collection: string };

/**
 * `req.i18n` is in the predicate on purpose: only a request Payload itself built carries it, so a
 * hand-rolled stand-in makes this rule throw instead of answering, and the "allowed" case below then
 * fails. Removing that clause removes the only coverage of the request the evaluator is handed.
 */
const withCollectionRule = (collections: CollectionConfig[]): CollectionConfig[] =>
  collections.map((c) => {
    if (c.slug !== "docs") return c;
    return {
      ...c,
      access: {
        update: ({ req, data }: { req: PayloadRequest; data?: { ref?: string } }) =>
          Boolean(req.i18n.language) && data?.ref !== "locked",
      },
      // `access: { update: () => true }` is what makes this fixture discriminating: without it every
      // field inherits the collection's refusal and the write stops on the prune instead, so the
      // collection-level check is never exercised. Measured — removing it leaves the file green
      // against a broken predicate.
      fields: [
        ...c.fields,
        { name: "tagline", type: "text", localized: true, access: { update: () => true } },
      ],
    } as CollectionConfig;
  });

/** What the German locale holds before the source is edited; a refusal must leave it exactly this. */
const UNTOUCHED_DE = { title: "Eigener Titel", tagline: "Eigene Zeile" };

const germanDoc = async (id: string) =>
  (await ctx.payload.findByID({
    collection: "docs" as "pages",
    id,
    locale: "de",
    draft: true,
  })) as { title?: string; tagline?: string };

describe("a collection rule decides the translation, and it is read a real request", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: withCollectionRule(buildTestCollections()),
      autoTranslate: { targets: ["de"] },
    });
    // A real row: the check looks the requester up, and an id resolving to nothing would make every
    // case here pass through the "requester missing" branch instead of through the rules.
    const user = await ctx.payload.create({
      collection: "users" as "pages",
      data: { email: "editor@test.dev", password: "pw123456" } as never,
    });
    editor = { id: String((user as { id: string | number }).id), collection: "users" };
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  const seed = async (ref: string, title: string, tagline: string) => {
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { ref, title, tagline } as never,
      user: editor as never,
    });
    const id = String(created.id);
    await ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "de",
      data: UNTOUCHED_DE as never,
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

  it("nothing is written into a document the collection refuses", async () => {
    const id = await seed("locked", "Locked", "Locked line");

    await publishEdit(id, "Locked edited", "Locked line edited");

    const de = await germanDoc(id);
    expect(de.title, "the refusal is the whole document, not one field").toBe(UNTOUCHED_DE.title);
    expect(de.tagline).toBe(UNTOUCHED_DE.tagline);
  });

  it("a document the same rule allows is translated", async () => {
    const id = await seed("open", "Open", "Open line");

    await publishEdit(id, "Open edited", "Open line edited");

    const de = await germanDoc(id);
    expect(de.title).toBe("de:Open edited");
    expect(de.tagline).toBe("de:Open line edited");
  });

  it("the editor's own save survives either answer", async () => {
    const id = await seed("locked", "Third", "Third line");

    await publishEdit(id, "Editor wrote this", "And this");

    const en = (await ctx.payload.findByID({
      collection: "docs" as "pages",
      id,
      locale: "en",
      draft: true,
    })) as { title?: string; tagline?: string };
    expect(en.title).toBe("Editor wrote this");
    expect(en.tagline).toBe("And this");
  });
});
