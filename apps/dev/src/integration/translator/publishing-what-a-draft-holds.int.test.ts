import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

let ctx: TestPayload;

const german = (id: string) =>
  ctx.payload.findByID({
    collection: "docs",
    id,
    locale: "de",
    draft: true,
    fallbackLocale: false,
  }) as Promise<Record<string, unknown>>;

const publish = (id: string) =>
  ctx.payload.update({ collection: "docs", id, locale: "en", data: { _status: "published" } });

describe("auto-translate when the text arrives as a draft and is published afterwards", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({ autoTranslate: { targets: ["de"] } });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("translates a document first saved as a draft, then published", async () => {
    const before = ctx.translateCount();

    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { title: "Written as a draft" },
    });
    const id = String(made.id);
    expect(ctx.translateCount() - before).toBe(0); // the publish gate, as designed

    await publish(id);

    expect(ctx.translateCount() - before).toBe(1);
    expect((await german(id)).title).toBe("de:Written as a draft");
  });

  it("translates an edit saved as a draft on an already published document", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "First text" },
    });
    const id = String(made.id);
    expect((await german(id)).title).toBe("de:First text");

    const before = ctx.translateCount();
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      draft: true,
      data: { title: "Second text" },
    });
    expect(ctx.translateCount() - before).toBe(0); // the publish gate again

    await publish(id);

    expect(ctx.translateCount() - before).toBe(1);
    expect((await german(id)).title).toBe("de:Second text");
  });

  it("spends nothing republishing a document whose translatable text did not move", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Settled text" },
    });
    const id = String(made.id);

    const before = ctx.translateCount();
    await publish(id);

    expect(ctx.translateCount() - before).toBe(0);
  });

  // The publish carries the text, so the newest draft still reads "A second thought" when the hook
  // runs. Comparing against the previous publish answers "unchanged"; comparing against the newest
  // version of any status answers "changed" and spends.
  it("spends nothing when a draft is edited and the publish puts the text back as it was", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Original wording" },
    });
    const id = String(made.id);

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      draft: true,
      data: { title: "A second thought" },
    });

    const before = ctx.translateCount();
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Original wording" },
    });

    expect(ctx.translateCount() - before).toBe(0);
  });

  it("is unaffected by the published row the plugin's own target-locale write leaves behind", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "First wording" },
    });
    const id = String(made.id);
    expect((await german(id)).title).toBe("de:First wording");

    const before = ctx.translateCount();
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Second wording" },
    });

    expect(ctx.translateCount() - before).toBe(1);
    expect((await german(id)).title).toBe("de:Second wording");

    // The spend direction: the plugin's German publish is the newest published row of this document,
    // and reading it as the baseline would make the English text look changed every time.
    const beforeRepublish = ctx.translateCount();
    await publish(id);
    expect(ctx.translateCount() - beforeRepublish).toBe(0);
  });

  it("translates text typed straight into a publishing save — the path the suite already knew", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { title: "Draft text" },
    });
    const id = String(made.id);

    const before = ctx.translateCount();
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Changed while publishing" },
    });

    expect(ctx.translateCount() - before).toBe(1);
    expect((await german(id)).title).toBe("de:Changed while publishing");
  });
});
