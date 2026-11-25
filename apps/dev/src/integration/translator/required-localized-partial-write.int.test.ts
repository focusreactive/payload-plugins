import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

/**
 * Payload refuses a write into a target locale that leaves a REQUIRED localized field empty, and
 * the whole write is lost — not the one field.
 *
 * This is the premise the admin's `mustInclude` rests on: the field picker locks such leaves so a
 * person cannot assemble a partial translation Payload will then reject.
 * `docs/plans/2026-10-23-what-the-admin-needs-from-the-server.md` §3 asserted it; nothing checked
 * it until this spec.
 *
 * Localization fallback is off in this boot, so an unwritten locale reads as empty rather than
 * borrowing the default locale's text — the state a partial translation leaves behind.
 */
const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "note", type: "text", localized: true },
  ],
};

let ctx: TestPayload;
let id: string;

const refusalOf = async (write: Promise<unknown>): Promise<string> =>
  await write.then(
    () => "accepted",
    (error: unknown) => (error instanceof Error ? error.message : String(error))
  );

const germanNote = async (): Promise<unknown> => {
  const de = await ctx.payload.findByID({
    collection: "docs",
    id,
    locale: "de",
    fallbackLocale: false,
    depth: 0,
  });
  return (de as unknown as Record<string, unknown>).note;
};

beforeAll(async () => {
  ctx = await bootTestPayload({ collections: [docs] });
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { title: "An English title", note: "An English note" },
  });
  id = String(made.id);
});

afterAll(async () => {
  await ctx?.cleanup();
});

describe("a partial write into a locale whose required field would stay empty", () => {
  it("is refused, naming the required field", async () => {
    const refusal = await refusalOf(
      ctx.payload.update({
        collection: "docs",
        id,
        locale: "de",
        data: { note: "Eine deutsche Notiz" },
      })
    );

    expect(refusal).toBe("The following field is invalid: Title");
  });

  it("loses the whole write, not just the field it named", async () => {
    expect(
      await germanNote(),
      "the note travelled with the refused write and did not land"
    ).toBeUndefined();
  });

  it("accepts the same write once the required field travels with it", async () => {
    const refusal = await refusalOf(
      ctx.payload.update({
        collection: "docs",
        id,
        locale: "de",
        data: { title: "Ein deutscher Titel", note: "Eine deutsche Notiz" },
      })
    );

    expect(refusal, "so the refusal is about the required field, not about partial writes").toBe(
      "accepted"
    );
    expect(await germanNote()).toBe("Eine deutsche Notiz");
  });

  it("refuses again on a locale that already has content, which is how a late required field behaves", async () => {
    const refusal = await refusalOf(
      ctx.payload.update({
        collection: "docs",
        id,
        locale: "fr",
        data: { note: "Une note" },
      })
    );

    expect(refusal, "fr holds nothing, as a locale does before its first translation").toBe(
      "The following field is invalid: Title"
    );
  });
});
