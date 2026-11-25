import { describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";

import type { TranslatableTextPresence } from "../../../../core/domain/content-projection/holdsTranslatableText.js";
import { localesHoldingContent } from "../localesHoldingContent.js";

/** Stands in for the walk: a document holds text when its `title` does. */
const titleHoldsText: TranslatableTextPresence = (_collection, doc) =>
  typeof doc.title === "string" && doc.title.trim().length > 0;

type Documents = Record<string, Array<Record<string, unknown>>>;

const payloadReturning = (perLocale: Documents) => {
  const find = vi.fn(async ({ locale }: { locale: string }) => ({
    docs: perLocale[locale] ?? [],
  }));
  const collections = { posts: { config: { versions: { drafts: true } } } };
  return { payload: { find, collections } as unknown as Payload, find };
};

const ask = async (perLocale: Documents, over: Record<string, unknown> = {}) => {
  const { payload, find } = payloadReturning(perLocale);
  const holding = await localesHoldingContent({
    payload,
    collection: "posts",
    grantedIds: ["doc-1", "doc-2"],
    locales: ["en", "de", "fr"],
    holdsText: titleHoldsText,
    ...over,
  });
  return { holding, find };
};

const withTitle = (id: string, title: unknown) => ({ id, title });

describe("which locales hold anything translatable", () => {
  it("asks each locale once for the whole page, and names the documents that answered", async () => {
    const { holding, find } = await ask({
      en: [withTitle("doc-1", "One"), withTitle("doc-2", "Two")],
      fr: [withTitle("doc-2", "Deux")],
    });

    expect(find).toHaveBeenCalledTimes(3);
    expect([...(holding.get("en") ?? [])]).toStrictEqual(["doc-1", "doc-2"]);
    expect([...(holding.get("fr") ?? [])]).toStrictEqual(["doc-2"]);
    expect([...(holding.get("de") ?? [])]).toStrictEqual([]);
  });

  it("names the documents by id alone, leaving the fields to the walk", async () => {
    const { find } = await ask({ en: [withTitle("doc-1", "One")] });

    expect(find.mock.calls[0]?.[0]).toMatchObject({
      collection: "posts",
      locale: "en",
      fallbackLocale: false,
      draft: true,
      where: { id: { in: ["doc-1", "doc-2"] } },
    });
  });

  it("drops a document the locale returned but holds no text in", async () => {
    const { holding } = await ask({
      en: [withTitle("doc-1", "One"), withTitle("doc-2", "   ")],
    });

    expect([...(holding.get("en") ?? [])]).toStrictEqual(["doc-1"]);
  });

  it("answers for a locale whose documents hold nothing at all", async () => {
    const { holding, find } = await ask({ en: [withTitle("doc-1", ""), withTitle("doc-2", "")] });

    expect(find).toHaveBeenCalledTimes(3);
    expect([...(holding.get("en") ?? [])]).toStrictEqual([]);
  });

  it("asks nothing where nobody asked about a document", async () => {
    const noDocuments = await ask({ en: [withTitle("doc-1", "One")] }, { grantedIds: [] });

    expect(noDocuments.find).not.toHaveBeenCalled();
    expect([...noDocuments.holding.keys()]).toStrictEqual([]);
  });

  it("does not re-decide what the caller may see, since that was decided before it was asked", async () => {
    const { find } = await ask({ en: [withTitle("doc-1", "One")] });

    expect(find.mock.calls[0]?.[0]).toMatchObject({ overrideAccess: true });
    expect(find.mock.calls[0]?.[0]).not.toHaveProperty("user");
  });
});
