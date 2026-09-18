import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig, PayloadRequest } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

let ctx: TestPayload;
let editor: { id: string; collection: string };

/**
 * One rule, answering differently per document, so a single boot can show both halves.
 *
 * It **reads the request** — `i18n`, which only a request Payload itself built actually carries — so
 * a hand-rolled `{ payload, user }` stand-in makes it throw a `TypeError`, and Payload answers a
 * throwing access rule by killing the caller's transaction. The "allowed" case below is what makes
 * that visible: with a stand-in the rule cannot say yes, and nothing is translated.
 *
 * It then **refuses the update** for a document marked locked. That is the headline case of the whole
 * branch, and the one nothing used to cover: the sanitizer expresses a refusal by deleting the key,
 * never by setting it false, so a check reading the answer as `update !== false` agrees with every
 * refusal ever written.
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
      fields: [...c.fields, { name: "tagline", type: "text", localized: true }],
    } as CollectionConfig;
  });

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

  it("nothing is written into a document the collection refuses", async () => {
    const id = await seed("locked", "Locked", "Locked line");

    await publishEdit(id, "Locked edited", "Locked line edited");

    const de = await germanDoc(id);
    expect(de.title, "the refusal is the whole document, not one field").toBe("Eigener Titel");
    expect(de.tagline).toBe("Eigene Zeile");
  });

  // The yes half, and the one that pins the request. A rule reading `req.i18n` off a stand-in throws
  // rather than answering, so this locale would stay as it was.
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
