import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

let ctx: TestPayload;
let editor: { id: string; collection: string };

/**
 * A collection rule that reads `data` — and the two evaluations it gets are not asked the same
 * question. The pre-check is fed the source document, where `ref` is set. Payload evaluates the same
 * rule at the write, where `data` is the partial translated payload and carries no `ref` at all.
 *
 * Left to disagree, the write is refused with `Forbidden` inside the editor's transaction and their
 * save goes with it. Measured on PostgreSQL before this fixture existed: it did.
 */
const withDataRule = (collections: CollectionConfig[]): CollectionConfig[] =>
  collections.map((c) =>
    c.slug === "docs"
      ? ({
          ...c,
          access: { update: ({ data }: { data?: { ref?: string } }) => data?.ref === "open" },
        } as CollectionConfig)
      : c
  );

describe("a collection rule that reads the payload", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: withDataRule(buildTestCollections()),
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

  it("the editor's save survives a rule the translated payload cannot satisfy", async () => {
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { ref: "open", title: "Probe" } as never,
      user: editor as never,
    });
    const id = String(created.id);

    await ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "en",
      data: { title: "Editor wrote this", _status: "published" } as never,
      user: editor as never,
    });

    const en = (await ctx.payload.findByID({
      collection: "docs" as "pages",
      id,
      locale: "en",
      draft: true,
    })) as { title?: string };
    expect(en.title, "the save that triggered the translation must survive").toBe(
      "Editor wrote this"
    );
  });
});
