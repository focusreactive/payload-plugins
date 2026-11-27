import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

/**
 * Can a person clear a locale that holds a REQUIRED localized field?
 *
 * The answer decides whether "this locale is empty and saved" proves "a partial write into it is
 * safe": if clearing is refused, an empty locale can only be one nobody has written yet.
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

const outcomeOf = async (write: Promise<unknown>): Promise<string> =>
  await write.then(
    () => "accepted",
    (e: unknown) => (e instanceof Error ? e.message : String(e))
  );

beforeAll(async () => {
  ctx = await bootTestPayload({ collections: [docs] });
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { title: "An English title", note: "An English note" },
  });
  id = String(made.id);
  await ctx.payload.update({
    collection: "docs",
    id,
    locale: "de",
    data: { title: "Ein deutscher Titel", note: "Eine deutsche Notiz" },
  });
});

afterAll(async () => {
  await ctx?.cleanup();
});

describe("clearing a locale that has a required localized field", () => {
  it("refuses to clear the required field", async () => {
    expect(
      await outcomeOf(
        ctx.payload.update({
          collection: "docs",
          id,
          locale: "de",
          data: { title: null, note: null },
        })
      )
    ).toBe("The following field is invalid: Title");
  });

  it("so the locale still holds its text", async () => {
    const de = (await ctx.payload.findByID({
      collection: "docs",
      id,
      locale: "de",
      fallbackLocale: false,
      depth: 0,
    })) as unknown as Record<string, unknown>;

    expect(de.title).toBe("Ein deutscher Titel");
  });

  it("clearing only the optional field is accepted", async () => {
    expect(
      await outcomeOf(
        ctx.payload.update({ collection: "docs", id, locale: "de", data: { note: null } })
      )
    ).toBe("accepted");
  });
});
