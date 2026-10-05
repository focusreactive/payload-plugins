import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;

const translate = (
  id: string,
  strategy: "overwrite" | "skip_existing",
  { publish }: { publish: boolean }
) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: "docs",
      collection_id: [id],
      strategy,
      publish_on_translation: publish,
    },
  });

const germanDraft = (id: string) =>
  ctx.payload.findByID({
    collection: "docs",
    id,
    locale: "de",
    draft: true,
  }) as Promise<Record<string, unknown>>;

describe("a hand edit saved as a draft, then re-translated with skip_existing", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload();
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("survives when the translation was published", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Source title", note: "Source note" },
    });
    const id = String(made.id);

    await translate(id, "overwrite", { publish: true });
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { title: "de:Source title — PLUS MEINE WORTE" },
      draft: true,
    });

    await translate(id, "skip_existing", { publish: false });

    expect((await germanDraft(id)).title).toBe("de:Source title — PLUS MEINE WORTE");
  });

  it("survives when the translation was left as a draft", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Draft title", note: "Draft note" },
    });
    const id = String(made.id);

    await translate(id, "overwrite", { publish: false });
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { title: "de:Draft title — PLUS MEINE WORTE" },
      draft: true,
    });

    await translate(id, "skip_existing", { publish: false });

    expect((await germanDraft(id)).title).toBe("de:Draft title — PLUS MEINE WORTE");
  });

  it("survives when ANOTHER English field is edited to make the document stale", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Stale title", note: "Stale note" },
    });
    const id = String(made.id);

    await translate(id, "overwrite", { publish: false });

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { title: "de:Stale title — PLUS MEINE WORTE" },
      draft: true,
    });

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Stale title", note: "Stale note, rewritten" },
    });

    await translate(id, "skip_existing", { publish: false });

    const de = await germanDraft(id);
    expect(de.note, "its source moved").toBe("de:Stale note, rewritten");
    expect(de.title, "its source did NOT move — the hand edit must stand").toBe(
      "de:Stale title — PLUS MEINE WORTE"
    );
  });
});
