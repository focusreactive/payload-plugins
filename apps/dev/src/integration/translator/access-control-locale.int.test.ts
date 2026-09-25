import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig, PayloadRequest } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

let ctx: TestPayload;
let editor: { id: string; collection: string };

/**
 * "This editor owns English but not German" — the ordinary way a host expresses per-locale rights,
 * and the shape the check used to read backwards. `createLocalReq` fills an absent locale from the
 * project's default, so the rules were asked about `en`, said yes, and that yes authorised a write
 * to `de`.
 *
 * Discriminating on PostgreSQL only: with no caller transaction the inline write hands Payload
 * `overrideAccess: false` and Payload re-checks at the target locale itself, hiding the mistake.
 */
const withLocaleRule = (collections: CollectionConfig[]): CollectionConfig[] =>
  collections.map((c) =>
    c.slug === "docs"
      ? ({
          ...c,
          access: { update: ({ req }: { req: PayloadRequest }) => req.locale !== "de" },
          fields: [...c.fields, { name: "tagline", type: "text", localized: true }],
        } as CollectionConfig)
      : c
  );

const inLocale = async (id: string, locale: "de" | "fr") =>
  (await ctx.payload.findByID({
    collection: "docs" as "pages",
    id,
    locale,
    draft: true,
  })) as { title?: string; tagline?: string };

describe("a rule keyed on the locale decides the locale being written", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: withLocaleRule(buildTestCollections()),
      autoTranslate: { targets: ["de", "fr"] },
    });
    const user = await ctx.payload.create({
      collection: "users" as "pages",
      data: { email: "editor@test.dev", password: "pw123456" } as never,
    });
    editor = { id: String((user as { id: string | number }).id), collection: "users" };
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  const seed = async () => {
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: "Source", tagline: "Source line" } as never,
      user: editor as never,
    });
    const id = String(created.id);
    for (const locale of ["de", "fr"] as const) {
      await ctx.payload.update({
        collection: "docs" as "pages",
        id,
        locale,
        data: { title: `Eigener ${locale}`, tagline: `Eigene Zeile ${locale}` } as never,
        draft: true,
      });
    }
    return id;
  };

  const publishEdit = (id: string) =>
    ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "en",
      data: { title: "Edited", tagline: "Edited line", _status: "published" } as never,
      user: editor as never,
    });

  it("the refused locale is not written", async () => {
    const id = await seed();

    await publishEdit(id);

    expect((await inLocale(id, "de")).title).toBe("Eigener de");
  });

  // The same rule, the same request, the same save — and this locale it allows. Without it the first
  // assertion would also pass with the check switched off entirely.
  it("a locale the same rule allows is written", async () => {
    const id = await seed();

    await publishEdit(id);

    expect((await inLocale(id, "fr")).title).toBe("fr:Edited");
  });
});
