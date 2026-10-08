import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// #118: `skip_existing` refused to refresh a locale the admin calls out of date, because its only
// criterion was "is the target empty".

const tr = (locale: string, text: string) => `${locale}:${text}`;

let ctx: TestPayload;

const create = async (data: Record<string, unknown>): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", ...data },
  });
  return String(made.id);
};

const editSource = (id: string, data: Record<string, unknown>) =>
  ctx.payload.update({
    collection: "docs",
    id,
    locale: "en",
    data: { _status: "published", ...data },
  });

const translate = (id: string, strategy: "overwrite" | "skip_existing") =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: "docs",
      collection_id: [id],
      strategy,
      publish_on_translation: true,
    },
  });

const keepingRowIds = (items: { id: string; label: string }[]) =>
  items.map(({ id, label }) => ({ id, label }));

const german = (id: string) =>
  ctx.payload.findByID({ collection: "docs", id, locale: "de" }) as Promise<
    Record<string, unknown>
  >;

const english = (id: string) =>
  ctx.payload.findByID({ collection: "docs", id, locale: "en" }) as Promise<
    Record<string, unknown>
  >;

describe("a translation refreshes the leaf whose source moved, and only that one", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload();
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("refreshes a stale leaf that skip_existing used to skip (#118)", async () => {
    const id = await create({ title: "Original title", note: "Original note" });
    await translate(id, "overwrite");

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", title: "KORRIGIERT" },
    });
    await editSource(id, { title: "Original title", note: "Note, rewritten" });

    await translate(id, "skip_existing");

    const de = await german(id);
    expect(de.note, "its source moved, so it is refreshed — this is what #118 asks for").toBe(
      tr("de", "Note, rewritten")
    );
    expect(de.title, "its source never moved, so the correction survives").toBe("KORRIGIERT");
  });

  it("sends only the changed leaf to the provider", async () => {
    const id = await create({ title: "Only one moves", note: "Steady" });
    await translate(id, "overwrite");

    await editSource(id, { title: "Only one moves, edited", note: "Steady" });

    const before = ctx.translateCount();
    await translate(id, "skip_existing");
    expect(ctx.translateCount() - before, "one provider call for the one run").toBe(1);

    const de = await german(id);
    expect(de.title).toBe(tr("de", "Only one moves, edited"));
    expect(de.note).toBe(tr("de", "Steady"));
  });

  it("leaves a filled-in target alone when NO receipt exists at all", async () => {
    const id = await create({ title: "No receipt", note: "No receipt note" });
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", title: "HAND-WRITTEN" },
    });

    await translate(id, "skip_existing");

    const de = await german(id);
    expect(de.title, "no evidence its source moved, so the old promise holds").toBe("HAND-WRITTEN");
    expect(de.note, "empty, so it is filled in as it always was").toBe(tr("de", "No receipt note"));
  });

  it("translates only the inserted element when one is added at the head of an array", async () => {
    const id = await create({
      title: "Array head",
      items: [{ label: "First" }, { label: "Second" }],
    });
    await translate(id, "overwrite");

    const de = await german(id);
    const germanItems = de.items as { id: string; label: string }[];
    expect(germanItems).toHaveLength(2);

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: {
        _status: "published",
        items: germanItems.map((item) => ({ ...item, label: `KORRIGIERT ${item.label}` })),
      },
    });
    const en = (await english(id)) as { items: { id: string; label: string }[] };
    await editSource(id, {
      title: "Array head",
      items: [{ label: "Inserted" }, ...keepingRowIds(en.items)],
    });

    await translate(id, "skip_existing");

    const after = (await german(id)) as { items: { label: string }[] };
    const labels = after.items.map((item) => item.label);
    expect(
      labels,
      "a positional address would have shifted every sibling onto its neighbour"
    ).toEqual([tr("de", "Inserted"), "KORRIGIERT de:First", "KORRIGIERT de:Second"]);
  });

  it("refreshes a changed leaf nested inside an array", async () => {
    const id = await create({
      title: "Array staleness",
      items: [{ label: "Alpha" }, { label: "Beta" }],
    });
    await translate(id, "overwrite");

    const en = (await english(id)) as { items: { id: string; label: string }[] };
    await editSource(id, {
      title: "Array staleness",
      items: [
        { id: en.items[0].id, label: "Alpha" },
        { id: en.items[1].id, label: "Beta, rewritten" },
      ],
    });

    const midway = (await german(id)) as { items: { label: string }[] };
    expect(
      midway.items.map((item) => item.label),
      "still the old translation, or the case below passes for reasons unrelated to the receipt"
    ).toEqual([tr("de", "Alpha"), tr("de", "Beta")]);

    await translate(id, "skip_existing");

    const after = (await german(id)) as { items: { label: string }[] };
    expect(after.items.map((item) => item.label)).toEqual([
      tr("de", "Alpha"),
      tr("de", "Beta, rewritten"),
    ]);
  });

  it("leaves a filled-in target alone when a receipt exists but has no entry for that leaf", async () => {
    const id = await create({ title: "Partial receipt", note: "" });
    await translate(id, "overwrite");

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", note: "HAND-WRITTEN NOTE" },
    });
    await editSource(id, { title: "Partial receipt", note: "A note exists now" });

    await translate(id, "skip_existing");

    const de = await german(id);
    expect(de.note, "the receipt says nothing about this leaf, so nothing is claimed").toBe(
      "HAND-WRITTEN NOTE"
    );
  });

  // Fingerprinting the target instead would tell a human's text from ours, but a Payload round-trip
  // can rewrite the stored value, so every leaf would read as hand-edited and refreshes would stop
  // silently.
  it("overwrites a hand-rewritten target once its own source moves — the trade this change makes", async () => {
    const id = await create({ title: "Owned by a human", note: "Steady note" });
    await translate(id, "overwrite");

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", title: "VON HAND GESCHRIEBEN" },
    });
    await editSource(id, { title: "Owned by a human, edited", note: "Steady note" });

    await translate(id, "skip_existing");

    const de = await german(id);
    expect(de.title, "the receipt cannot tell a human's text from ours, so the refresh wins").toBe(
      tr("de", "Owned by a human, edited")
    );
  });
});
