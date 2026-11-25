import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

/**
 * Can Payload answer "has this locale ever been written?" without walking the document?
 *
 * Three candidate probes against a document that exists only in `en`:
 *   1. findByID with the target locale      — does a document come back at all?
 *   2. find + `exists: true` on one field   — does the row drop out of the result?
 *   3. the same after the locale is written — does it come back?
 *
 * Localization fallback is off in this boot, so nothing borrows the default locale's text.
 */
const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true },
    { name: "note", type: "text", localized: true },
    { name: "ref", type: "text" },
  ],
};

let ctx: TestPayload;
let id: string;

const probeById = async (locale: string): Promise<unknown> =>
  await ctx.payload.findByID({
    collection: "docs",
    id,
    locale,
    fallbackLocale: false,
    depth: 0,
  });

const probeByExists = async (locale: string): Promise<number> => {
  const found = await ctx.payload.find({
    collection: "docs",
    locale,
    fallbackLocale: false,
    depth: 0,
    where: { or: [{ title: { exists: true } }, { note: { exists: true } }] },
  });
  return found.docs.length;
};

beforeAll(async () => {
  ctx = await bootTestPayload({ collections: [docs] });
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { title: "An English title", note: "An English note", ref: "shared" },
  });
  id = String(made.id);
});

afterAll(async () => {
  await ctx?.cleanup();
});

describe("asking Payload whether a locale was ever written", () => {
  it("findByID on an unwritten locale still returns the document", async () => {
    const de = (await probeById("de")) as Record<string, unknown>;

    expect(de, "the document comes back; only the localized values are missing").toMatchObject({
      id: expect.anything(),
      ref: "shared",
    });
    expect({ title: de.title, note: de.note }).toEqual({ title: undefined, note: undefined });
  });

  it("`exists` on the localized fields drops the document for an unwritten locale", async () => {
    expect(await probeByExists("de")).toBe(0);
  });

  it("`exists` keeps it for the locale that was written", async () => {
    expect(await probeByExists("en")).toBe(1);
  });

  it("and the document reappears for a locale once it is written", async () => {
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { note: "Eine deutsche Notiz" },
    });

    expect(await probeByExists("de")).toBe(1);
  });

  it("an emptied locale drops out again", async () => {
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { note: null },
    });

    expect(
      await probeByExists("de"),
      "so the probe answers `holds text now`, not `was ever written`"
    ).toBe(0);
  });
});
