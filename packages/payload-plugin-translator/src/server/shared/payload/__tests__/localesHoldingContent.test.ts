import { describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";

import { localesHoldingContent } from "../localesHoldingContent.js";
import { worldOfCollection } from "../worldOfCollection.js";

const LATEST_OF_A_DRAFTED_COLLECTION = worldOfCollection({ versions: { drafts: true } }).read
  .latest;

const payloadHolding = (held: Record<string, string[]>) => {
  const find = vi.fn(async ({ locale }: { locale: string }) => ({
    docs: (held[locale] ?? []).map((id) => ({ id })),
  }));
  return { payload: { find } as unknown as Payload, find };
};

const ask = async (held: Record<string, string[]>, over: Record<string, unknown> = {}) => {
  const { payload, find } = payloadHolding(held);
  const holding = await localesHoldingContent({
    payload,
    collection: "posts",
    grantedIds: ["doc-1", "doc-2"],
    locales: ["en", "de", "fr"],
    paths: ["title", "sections.heading"],
    read: LATEST_OF_A_DRAFTED_COLLECTION,
    ...over,
  });
  return { holding, find };
};

describe("which locales hold anything translatable", () => {
  it("asks each locale once for the whole page, and names the documents that answered", async () => {
    const { holding, find } = await ask({ en: ["doc-1", "doc-2"], fr: ["doc-2"] });

    expect(find).toHaveBeenCalledTimes(3);
    expect([...(holding.get("en") ?? [])]).toStrictEqual(["doc-1", "doc-2"]);
    expect([...(holding.get("fr") ?? [])]).toStrictEqual(["doc-2"]);
    expect([...(holding.get("de") ?? [])]).toStrictEqual([]);
  });

  it("asks whether any translatable path holds a value, in that locale alone", async () => {
    const { find } = await ask({ en: ["doc-1"] });

    expect(find.mock.calls[0]?.[0]).toMatchObject({
      collection: "posts",
      locale: "en",
      fallbackLocale: false,
      draft: true,
      where: {
        and: [
          { id: { in: ["doc-1", "doc-2"] } },
          { or: [{ title: { exists: true } }, { "sections.heading": { exists: true } }] },
        ],
      },
    });
  });

  it("asks nothing where the collection has nothing translatable, or nobody asked about a document", async () => {
    const nothingTranslatable = await ask({ en: ["doc-1"] }, { paths: [] });
    const noDocuments = await ask({ en: ["doc-1"] }, { grantedIds: [] });

    expect(nothingTranslatable.find).not.toHaveBeenCalled();
    expect(noDocuments.find).not.toHaveBeenCalled();
    expect([...nothingTranslatable.holding.keys()]).toStrictEqual([]);
  });

  it("does not re-decide what the caller may see, since that was decided before it was asked", async () => {
    const { find } = await ask({ en: ["doc-1"] });

    expect(find.mock.calls[0]?.[0]).toMatchObject({ overrideAccess: true });
    expect(find.mock.calls[0]?.[0]).not.toHaveProperty("user");
  });
});
