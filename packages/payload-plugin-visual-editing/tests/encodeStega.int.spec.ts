import { vercelStegaDecode } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import { defaultExcludeValues, isUrl } from "../src/excludeValues";
import { encodeStega } from "../src/internal/encodeStega";
import { META_KEY } from "../src/internal/shared";

const pagesSchema = {
  title: "text",
  hero: { heading: "text" },
};

describe("encodeStega", () => {
  it("regression: leaves blank text values untouched (no zero-width-only string)", () => {
    const schema = { title: "text", subtitle: "text", description: "textarea" };
    const data = {
      title: "Real heading",
      subtitle: "",
      description: "   \n\t  ",
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => (slug === "pages" ? schema : null));

    // Non-blank sibling still gets stega.
    expect(vercelStegaDecode<any>((result as any).title)).toMatchObject({ path: "title" });

    // Blank values are untouched — same string, no stega payload.
    expect((result as any).subtitle).toBe("");
    expect((result as any).description).toBe("   \n\t  ");
    expect(vercelStegaDecode((result as any).subtitle)).toBeUndefined();
    expect(vercelStegaDecode((result as any).description)).toBeUndefined();
    // _meta removed after encoding the holder.
    expect((result as any)[META_KEY]).toBeUndefined();
  });

  it("regression: holder with only blank text values stays clean and loses _meta", () => {
    const schema = { subtitle: "text" };
    const data = {
      subtitle: "",
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => (slug === "pages" ? schema : null));
    expect((result as any).subtitle).toBe("");
    expect(vercelStegaDecode((result as any).subtitle)).toBeUndefined();
    expect((result as any)[META_KEY]).toBeUndefined();
  });

  it("encodes per holder using each holder own collectionSlug", () => {
    const data = {
      title: "Outer",
      hero: {
        heading: "Inner",
        [META_KEY]: { path: "hero", docId: "p-1", collectionSlug: "pages", kind: "collection" },
      },
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => (slug === "pages" ? pagesSchema : null));
    const decoded = vercelStegaDecode<any>((result as any).title);
    expect(decoded).toMatchObject({
      path: "title",
      docId: "p-1",
      collectionSlug: "pages",
      kind: "collection",
    });
    const innerDecoded = vercelStegaDecode<any>((result as any).hero.heading);
    expect(innerDecoded).toMatchObject({ path: "hero.heading", docId: "p-1" });
    // _meta removed after encoding
    expect((result as any)[META_KEY]).toBeUndefined();
    expect((result as any).hero[META_KEY]).toBeUndefined();
  });

  it("routes sub-doc markers to their own collection schema", () => {
    const faqSchema = { question: "text" };
    const data = {
      title: "Page",
      faq: {
        question: "What?",
        [META_KEY]: { path: "question", docId: "f-9", collectionSlug: "faqs", kind: "collection" },
      },
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => {
      if (slug === "pages") return { title: "text", faq: "relationship:faqs" };
      if (slug === "faqs") return faqSchema;
      return null;
    });
    const decoded = vercelStegaDecode<any>((result as any).faq.question);
    expect(decoded).toMatchObject({
      path: "question",
      docId: "f-9",
      collectionSlug: "faqs",
      kind: "collection",
    });
  });

  it("embeds stega into textarea fields", () => {
    const schema = { title: "text", description: "textarea" };
    const data = {
      title: "Heading",
      description: "A longer body of prose.",
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => (slug === "pages" ? schema : null));
    const decoded = vercelStegaDecode<any>((result as any).description);
    expect(decoded).toMatchObject({
      path: "description",
      docId: "p-1",
      collectionSlug: "pages",
      kind: "collection",
    });
  });

  it("embeds stega into email fields", () => {
    const schema = { contact: "email" };
    const data = {
      contact: "hello@example.com",
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => (slug === "pages" ? schema : null));
    const decoded = vercelStegaDecode<any>((result as any).contact);
    expect(decoded).toMatchObject({
      path: "contact",
      docId: "p-1",
      collectionSlug: "pages",
      kind: "collection",
    });
  });

  it("regression: richText holders stay terminal, not stega-combined", () => {
    const schema = { body: "richText" };
    const data = {
      body: {
        root: { children: [] },
        [META_KEY]: { path: "body", docId: "p-1", collectionSlug: "pages", kind: "collection" },
      },
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => (slug === "pages" ? schema : null));
    // Container gets a terminal marker; no stega woven into any string.
    expect((result as any).body[META_KEY]).toMatchObject({
      terminal: true,
      path: "body",
      collectionSlug: "pages",
      docId: "p-1",
    });
  });

  it("marks rich text holders as terminal without overwriting", () => {
    const schema = { body: "richText" };
    const data = {
      body: { root: { children: [] } },
      [META_KEY]: { path: "body", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(
      {
        [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
        body: data,
      } as any,
      (slug) => (slug === "pages" ? { body: "richText" } : null)
    );
    // Meta preserved with terminal flag
    expect((result as any).body[META_KEY]).toMatchObject({
      terminal: true,
      path: "body",
      collectionSlug: "pages",
    });
  });

  it("encodes through blocks arrays — schema walk uses the full doc tree, not the holder object", () => {
    const heroBlockFields = { heading: { text: "text", level: "select" } };
    const pagesWithBlocks = {
      hero: { homeHero: heroBlockFields },
    };
    const data = {
      hero: [
        {
          blockType: "homeHero",
          heading: {
            text: "Welcome",
            level: "h1",
            [META_KEY]: {
              path: "hero.0.heading",
              docId: "p-1",
              collectionSlug: "pages",
              kind: "collection",
            },
          },
        },
      ],
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => (slug === "pages" ? pagesWithBlocks : null));
    const decoded = vercelStegaDecode<any>((result as any).hero[0].heading.text);
    expect(decoded).toMatchObject({
      path: "hero.0.heading.text",
      docId: "p-1",
      collectionSlug: "pages",
      kind: "collection",
    });
  });

  it("promotes terminal marker to the container when holder is nested inside richText", () => {
    // The enricher writes `_meta` on the first descendant with primitive
    // children. For richText, that's often `content.root` (which has
    // `type: 'root'`, `direction`, etc.) — not `content` itself. The encoder
    // must promote the terminal marker UP to `content` so renderers that do
    // `withVisualEditingPath(content)` see it.
    const schema = { content: "richText" };
    const contentRoot = {
      children: [],
      type: "root",
      direction: "ltr",
      format: "",
      indent: 0,
      version: 1,
      [META_KEY]: {
        path: "content.root",
        docId: "p-1",
        collectionSlug: "pages",
        kind: "collection",
      },
    };
    const data = {
      content: { root: contentRoot },
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => (slug === "pages" ? schema : null));
    // Container (the `content` object) gets the terminal marker.
    expect((result as any).content[META_KEY]).toMatchObject({
      terminal: true,
      path: "content",
      collectionSlug: "pages",
      docId: "p-1",
    });
    // The nested holder's _meta is cleared.
    expect((result as any).content.root[META_KEY]).toBeUndefined();
  });

  it("preserves _meta on populated uploads for wrapper-attr use", () => {
    const data = {
      title: "Hi",
      image: {
        id: "m-1",
        url: "/m-1.jpg",
        alt: "An image",
        [META_KEY]: { path: "", docId: "m-1", collectionSlug: "media", kind: "collection" },
      },
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };

    const result = encodeStega(data as any, (slug) => {
      if (slug === "pages") return { title: "text", image: "upload:media" };
      if (slug === "media") return { alt: "text", url: "text" };
      return null;
    });

    // The outer stega still flows through title
    expect(vercelStegaDecode<any>((result as any).title)).toMatchObject({
      path: "title",
      collectionSlug: "pages",
    });

    // The populated upload keeps its _meta (with terminal: true)
    expect((result as any).image[META_KEY]).toMatchObject({
      collectionSlug: "media",
      docId: "m-1",
      kind: "collection",
      terminal: true,
    });

    // alt stays plain — no stega was embedded since the upload was marked terminal
    expect((result as any).image.alt).toBe("An image");
  });

  it("preserves _meta on polymorphic populated uploads", () => {
    const data = {
      image: {
        relationTo: "media",
        value: {
          id: "m-2",
          url: "/m-2.jpg",
          alt: "pic",
          [META_KEY]: { path: "", docId: "m-2", collectionSlug: "media", kind: "collection" },
        },
      },
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };

    const result = encodeStega(data as any, (slug) => {
      if (slug === "pages") return { image: "upload:media|videos" };
      if (slug === "media") return { alt: "text", url: "text" };
      return null;
    });

    expect((result as any).image.value[META_KEY]).toMatchObject({
      terminal: true,
      collectionSlug: "media",
      docId: "m-2",
    });
    expect((result as any).image.value.alt).toBe("pic");
  });

  it("omits docId in stega when kind is global", () => {
    const data = {
      title: "Site",
      [META_KEY]: { path: "", collectionSlug: "siteSettings", kind: "global" },
    };
    const result = encodeStega(data as any, (slug) =>
      slug === "siteSettings" ? { title: "text" } : null
    );
    const decoded = vercelStegaDecode<any>((result as any).title);
    expect(decoded).toMatchObject({
      path: "title",
      collectionSlug: "siteSettings",
      kind: "global",
    });
    expect(decoded.docId).toBeUndefined();
  });

  // Regression: `"80%"` used to be silently skipped because V8's `Date.parse("80%")`
  // succeeds (year 1980) and @vercel/stega's auto-skip treats that as "date-like".
  // With the third-arg override + our own excludeValues list, the library's internal
  // heuristic is disabled and only our predicates decide.
  it("encodes percent-suffixed numeric values (no more Date.parse auto-skip)", () => {
    const schema = { value: "text" };
    const data = {
      value: "80%",
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => (slug === "pages" ? schema : null));
    const decoded = vercelStegaDecode<any>((result as any).value);
    expect(decoded).toMatchObject({ path: "value", docId: "p-1", collectionSlug: "pages" });
  });

  describe("with excludeValues", () => {
    const schema = { title: "text" };
    const resolve = (slug: string) => (slug === "pages" ? schema : null);

    const encode = (value: string, excludeValues = defaultExcludeValues) =>
      encodeStega(
        {
          title: value,
          [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
        } as any,
        resolve as any,
        excludeValues
      );

    it("skips encoding for URL-like values by default", () => {
      const result = encode("https://example.com");
      // Untouched — no stega chars appended.
      expect((result as any).title).toBe("https://example.com");
      expect(vercelStegaDecode((result as any).title)).toBeUndefined();
    });

    it("skips encoding for hyphen-joined slug-like values by default", () => {
      const result = encode("hello-world");
      expect((result as any).title).toBe("hello-world");
    });

    it("skips encoding for hash-prefixed values by default", () => {
      const result = encode("#section");
      expect((result as any).title).toBe("#section");
    });

    it("skips encoding for ISO-date values by default", () => {
      const result = encode("2024-01-15");
      expect((result as any).title).toBe("2024-01-15");
    });

    it("still encodes plain text and percent values", () => {
      // `2024` is a bare year — explicitly NOT an ISO date per the spec, so it must be tagged
      // at the integration layer, not only in the predicate unit test.
      for (const value of ["Career Advancement", "80%", "hello", "#1", "2024"]) {
        const result = encode(value);
        const decoded = vercelStegaDecode<any>((result as any).title);
        expect(decoded, `expected stega on ${JSON.stringify(value)}`).toMatchObject({
          path: "title",
        });
      }
    });

    it("replaces defaults when a custom list is passed", () => {
      // With only `isUrl`, slug-shaped values should now get stega'd.
      const result = encode("hello-world", [isUrl]);
      const decoded = vercelStegaDecode<any>((result as any).title);
      expect(decoded).toMatchObject({ path: "title", collectionSlug: "pages" });
    });

    it("an empty list disables all exclusions", () => {
      const result = encode("https://example.com", []);
      const decoded = vercelStegaDecode<any>((result as any).title);
      expect(decoded).toMatchObject({ path: "title" });
    });
  });
});
