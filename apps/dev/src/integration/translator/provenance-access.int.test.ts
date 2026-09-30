import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

let ctx: TestPayload;
let rowId: string | number;

const SIGNED_IN = { id: "u1", collection: "users", email: "low@priv.test" } as never;

const refused = async (attempt: () => Promise<unknown>) => {
  try {
    await attempt();
    return false;
  } catch {
    return true;
  }
};

// Before this, the collection declared no rules and inherited Payload's default — any signed-in user.
// Measured on that surface: read every row (an inventory of documents and locales, across collections
// the reader may not open), overwrite the dismissal field to silence the out-of-date indicator on
// someone else's document, or delete the history outright.
describe("the translation receipts are closed to the outside", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({ autoTranslate: { targets: ["de"] } });
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: "Recorded", _status: "published" } as never,
    });
    const { docs } = await ctx.payload.find({
      collection: "translator-provenance" as "pages",
      where: { documentId: { equals: String(created.id) } } as never,
      pagination: false,
    });
    rowId = (docs[0] as { id: string | number }).id;
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("the plugin still writes them", () => {
    expect(rowId).toBeDefined();
  });

  it("a signed-in caller cannot read them", async () => {
    expect(
      await refused(() =>
        ctx.payload.find({
          collection: "translator-provenance" as "pages",
          overrideAccess: false,
          user: SIGNED_IN,
          pagination: false,
        })
      )
    ).toBe(true);
  });

  it("a signed-in caller cannot silence the out-of-date indicator", async () => {
    expect(
      await refused(() =>
        ctx.payload.update({
          collection: "translator-provenance" as "pages",
          id: rowId,
          data: { dismissedFingerprint: "forged" } as never,
          overrideAccess: false,
          user: SIGNED_IN,
        })
      )
    ).toBe(true);
  });

  it("a signed-in caller cannot erase the history", async () => {
    expect(
      await refused(() =>
        ctx.payload.delete({
          collection: "translator-provenance" as "pages",
          id: rowId,
          overrideAccess: false,
          user: SIGNED_IN,
        })
      )
    ).toBe(true);
  });

  it("a signed-in caller cannot plant a row of their own", async () => {
    expect(
      await refused(() =>
        ctx.payload.create({
          collection: "translator-provenance" as "pages",
          data: {
            collectionSlug: "docs",
            documentId: "planted",
            targetLocale: "de",
            sourceLocale: "en",
            sourceFingerprint: "x",
            translatedAt: new Date().toISOString(),
          } as never,
          overrideAccess: false,
          user: SIGNED_IN,
        })
      )
    ).toBe(true);
  });
});
