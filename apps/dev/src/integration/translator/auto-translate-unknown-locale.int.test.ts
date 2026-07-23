import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

// R5 (unknown-locale drop) — in its OWN file because each spec file may boot Payload only once
// (multiple boots per process collide on Payload's module singletons). "xx" is not a configured
// locale → dropped at config time with a warning; "de" still translates.

const rev = (s: string) => [...s].reverse().join("");
const PROVENANCE = "translator-provenance";

describe("auto-translate — unknown target locale dropped", () => {
  let ctx: TestPayload;
  beforeAll(async () => {
    ctx = await bootTestPayload({ autoTranslate: { targets: ["de", "xx"] } });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("translates the valid target and drops the unknown one (no crash, no phantom record)", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Unknown-locale src" },
    });
    const id = String(created.id);
    const de = await ctx.payload.findByID({ collection: "docs", id, locale: "de" });
    expect(de.title).toBe(rev("Unknown-locale src"));
    const records = await ctx.payload.find({
      collection: PROVENANCE,
      where: { documentId: { equals: id } },
      pagination: false,
    });
    expect(
      (records.docs as unknown as { targetLocale: string }[]).map((r) => r.targetLocale)
    ).toEqual(["de"]);
  });
});
