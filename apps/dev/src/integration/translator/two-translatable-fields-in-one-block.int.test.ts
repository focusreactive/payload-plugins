import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

/*
 * Every other block fixture in this suite gives its block exactly one localized field, which is the
 * one shape that cannot reproduce this: the emptiness question reaches the database as one condition
 * per translatable field, and a block table joined once collides with nothing.
 */
const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true },
    { name: "note", type: "text", localized: true, hidden: true },
    {
      name: "sections",
      type: "blocks",
      blocks: [
        {
          slug: "hero",
          fields: [
            { name: "heading", type: "text", localized: true },
            { name: "subheading", type: "text", localized: true },
          ],
        },
      ],
    },
  ],
};

/** A refusal names its reason here; a success carries none. */
const messageOf = (data: unknown): string | undefined =>
  (data as { message?: string } | undefined)?.message;

type LocaleContent = { locale: string; content: { kind: string } };

const contentOf = (data: unknown, locale: string): string | undefined =>
  (data as { data: { locales: LocaleContent[] } }).data.locales.find((one) => one.locale === locale)
    ?.content.kind;

describe("a block holding more than one translatable field", () => {
  let ctx: TestPayload;
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload({ collections: [docs] });
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: {
        title: "An English title",
        sections: [{ blockType: "hero", heading: "Alpha", subheading: "Beta" }],
      },
    });
    id = String(made.id);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("answers the document state instead of failing", async () => {
    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/document-state/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );

    expect({ status: res.status, message: messageOf(res.data) }).toStrictEqual({
      status: 200,
      message: undefined,
    });
  });

  it("answers the list state instead of failing", async () => {
    const res = await callEndpoint(ctx.payload, "get", "/translate/list-state/:collection_slug", {
      routeParams: { collection_slug: "docs" },
      query: `ids=${id}`,
    });

    expect({ status: res.status, message: messageOf(res.data) }).toStrictEqual({
      status: 200,
      message: undefined,
    });
  });

  /*
   * German holds nothing, so this run is refused on its merits — a partial write would leave the
   * locale's other fields empty. The point is that it reaches that answer at all: the same request
   * used to fail while deciding whether German held anything.
   */
  it("reaches its own refusal for a run that names single leaves", async () => {
    const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de"],
        collection_slug: "docs",
        collection_id: [id],
        filters: [{ kind: "leaves", addresses: ["title"] }],
      },
    });

    expect({ status: res.status, message: messageOf(res.data) }).toStrictEqual({
      status: 400,
      message: expect.stringContaining("Nothing is written yet in de") as unknown as string,
    });
  });

  it("admits the same run once the locale holds text", async () => {
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { title: "Ein deutscher Titel" },
    });

    const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de"],
        collection_slug: "docs",
        collection_id: [id],
        filters: [{ kind: "leaves", addresses: ["title"] }],
      },
    });

    expect({ status: res.status, message: messageOf(res.data) }).toStrictEqual({
      status: 200,
      message: undefined,
    });
  });

  describe("what counts as holding text", () => {
    const stateFor = async (documentId: string) =>
      await callEndpoint(
        ctx.payload,
        "get",
        "/translate/document-state/:collection_slug/:collection_id",
        { routeParams: { collection_slug: "docs", collection_id: documentId } }
      );

    const madeWith = async (data: Record<string, unknown>): Promise<string> => {
      const made = await ctx.payload.create({ collection: "docs", locale: "en", data });
      return String(made.id);
    };

    it("reads a locale nobody wrote as empty", async () => {
      const fresh = await madeWith({ title: "Only English" });

      expect(contentOf((await stateFor(fresh)).data, "fr")).toBe("empty");
    });

    it("stops reading it as empty once the locale holds text", async () => {
      const fresh = await madeWith({ title: "Only English" });
      await ctx.payload.update({
        collection: "docs",
        id: fresh,
        locale: "fr",
        data: { title: "Un titre" },
      });

      expect(contentOf((await stateFor(fresh)).data, "fr")).not.toBe("empty");
    });

    it("reads it as empty again once the locale is cleared", async () => {
      const fresh = await madeWith({ title: "Only English" });
      await ctx.payload.update({
        collection: "docs",
        id: fresh,
        locale: "fr",
        data: { title: "Un titre" },
      });
      await ctx.payload.update({
        collection: "docs",
        id: fresh,
        locale: "fr",
        data: { title: null },
      });

      expect(contentOf((await stateFor(fresh)).data, "fr")).toBe("empty");
    });

    it("reads a locale holding whitespace alone as empty, as a run would", async () => {
      const fresh = await madeWith({ title: "Only English" });
      await ctx.payload.update({
        collection: "docs",
        id: fresh,
        locale: "fr",
        data: { title: "   " },
      });

      expect(contentOf((await stateFor(fresh)).data, "fr")).toBe("empty");
    });

    /*
     * A hidden field is a translation target by the schema, but no read in this package asks for
     * hidden fields, so a run can neither see nor translate one. Reporting the locale as holding
     * content would offer the editor a field picker over text nothing can act on.
     */
    it("reads a locale holding only a hidden field as empty, as a run would", async () => {
      const fresh = await madeWith({ title: "Only English" });
      await ctx.payload.update({
        collection: "docs",
        id: fresh,
        locale: "fr",
        data: { note: "Une note cachee" },
      });

      expect(contentOf((await stateFor(fresh)).data, "fr")).toBe("empty");
    });
  });
});
