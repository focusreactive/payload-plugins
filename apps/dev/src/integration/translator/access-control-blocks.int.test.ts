import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Block, CollectionConfig, Field } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

let ctx: TestPayload;
let editor: { id: string; collection: string };

/**
 * A rule on a field **inside a block**. Payload reports those under their own key, one entry per
 * block slug, not under the `fields` map everything else lives in — so a check that reads only
 * `fields` finds a blocks field entirely unremarkable and honours no rule declared in one. Blocks are
 * what most documents this plugin translates are made of, which is why this has its own fixture.
 *
 * It passes on every adapter, but it only *discriminates* on PostgreSQL: there the inline path runs
 * inside the editor's transaction, so the translator's own pre-check is the only thing standing
 * between the rule and the write. Without a transaction — SQLite and Mongo here — the write hands
 * Payload `overrideAccess: false` instead and Payload refuses it, which hides a broken pre-check.
 * Measured: with the block walk removed, this locale reads `de:Hero heading` on PostgreSQL and is
 * untouched on the other two.
 */
const withBlockRule = (collections: CollectionConfig[]): CollectionConfig[] =>
  collections.map((c) => {
    if (c.slug !== "docs") return c;
    const fields = c.fields.map((f: Field) => {
      if (!("name" in f) || f.name !== "sections" || f.type !== "blocks") return f;
      return {
        ...f,
        blocks: f.blocks.map((block: Block) =>
          block.slug !== "hero"
            ? block
            : {
                ...block,
                fields: block.fields.map((bf: Field) =>
                  "name" in bf && bf.name === "heading"
                    ? { ...bf, access: { update: () => false } }
                    : bf
                ),
              }
        ),
      } as Field;
    });
    return { ...c, fields } as CollectionConfig;
  });

const germanSections = async (id: string) => {
  const doc = (await ctx.payload.findByID({
    collection: "docs" as "pages",
    id,
    locale: "de",
    draft: true,
  })) as { sections?: Array<Record<string, unknown>> };
  return doc.sections ?? [];
};

describe("a rule declared inside a block is honoured", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: withBlockRule(buildTestCollections()),
      autoTranslate: { targets: ["de"] },
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
      data: {
        title: "Blocks",
        sections: [
          { blockType: "hero", heading: "Hero heading", anchor: "shared-anchor" },
          { blockType: "cta", caption: "Call to action" },
        ],
      } as never,
      user: editor as never,
    });
    return String(created.id);
  };

  it("the refused block field keeps its value while its neighbours translate", async () => {
    const id = await seed();
    // Give the target locale its own text first, so "left alone" reads differently from "blank".
    const de = await germanSections(id);
    await ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "de",
      draft: true,
      data: {
        sections: [
          { ...de[0], heading: "Eigene Überschrift" },
          { ...de[1], caption: "Eigener Aufruf" },
        ],
      } as never,
    });

    await ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "en",
      data: { title: "Blocks edited", _status: "published" } as never,
      user: editor as never,
    });

    const [hero, cta] = await germanSections(id);
    expect(hero.heading, "the rule sits on this one").toBe("Eigene Überschrift");
    expect(cta.caption, "its neighbour in another block is not affected").toBe("de:Call to action");
    // The non-localized sibling is shared across locales; pruning by path must not cost it its value.
    expect(hero.anchor).toBe("shared-anchor");
  });
});
