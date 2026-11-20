import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

// Both `.fails`: the publish gate turns the draft save away, and the drift gate then turns the
// publish away because the text arrived one save earlier — no edit reaching a locale through a
// draft is auto-translated.

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

  it.fails("translates a document first saved as a draft, then published", async () => {
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

  it.fails("translates an edit saved as a draft on an already published document", async () => {
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
