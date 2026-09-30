import { describe, expect, it } from "vitest";

import { enrichWithPathMeta } from "../src/internal/enrichWithPathMeta";
import { META_KEY } from "../src/internal/shared";

const docInfo = { docId: "doc-1", collectionSlug: "pages", kind: "collection" as const };

describe("enrichWithPathMeta", () => {
  it("stamps docInfo on every holder with primitive children", () => {
    const result = enrichWithPathMeta({ title: "Hi", nested: { label: "L" } }, docInfo);
    expect((result as any)[META_KEY]).toEqual({
      path: "",
      docId: "doc-1",
      collectionSlug: "pages",
      kind: "collection",
    });
    expect((result as any).nested[META_KEY]).toEqual({
      path: "nested",
      docId: "doc-1",
      collectionSlug: "pages",
      kind: "collection",
    });
  });

  it("preserves existing _meta on already-enriched sub-docs", () => {
    const innerMeta = {
      path: "question",
      docId: "faq-9",
      collectionSlug: "faqs",
      kind: "collection",
    };
    const outer = {
      title: "Page",
      faq: { question: "Q?", [META_KEY]: innerMeta },
    };
    const result = enrichWithPathMeta(outer, docInfo);
    // Inner meta untouched
    expect((result as any).faq[META_KEY]).toEqual(innerMeta);
  });

  it("omits docId when kind is global", () => {
    const result = enrichWithPathMeta(
      { title: "Site" },
      {
        collectionSlug: "siteSettings",
        kind: "global",
      }
    );
    expect((result as any)[META_KEY]).toEqual({
      path: "",
      collectionSlug: "siteSettings",
      kind: "global",
    });
  });

  it("keeps _meta on every block when a single blocks field is the only container", () => {
    const page = {
      title: "Hi",
      slug: "hi",
      sections: [
        { id: "a", blockType: "hero", title: "Hero", description: "Desc" },
        { id: "b", blockType: "copy", text: "Body" },
      ],
    };
    const result = enrichWithPathMeta(page, docInfo) as any;
    expect(result.sections[0][META_KEY]).toMatchObject({ path: "sections.0", docId: "doc-1" });
    expect(result.sections[1][META_KEY]).toMatchObject({ path: "sections.1", docId: "doc-1" });
  });

  it("keeps _meta on every array row when a single array field is the only container", () => {
    const page = {
      title: "Hi",
      items: [
        { id: "a", label: "One" },
        { id: "b", label: "Two" },
      ],
    };
    const result = enrichWithPathMeta(page, docInfo) as any;
    expect(result.items[0][META_KEY]).toMatchObject({ path: "items.0", docId: "doc-1" });
    expect(result.items[1][META_KEY]).toMatchObject({ path: "items.1", docId: "doc-1" });
  });

  it("still consolidates Lexical-internal arrays to a single anchor (no id/blockType)", () => {
    const page = {
      body: {
        root: {
          type: "root",
          direction: "ltr",
          format: "",
          indent: 0,
          version: 1,
          children: [
            {
              type: "paragraph",
              direction: "ltr",
              format: "",
              indent: 0,
              version: 1,
              children: [{ type: "text", text: "Hello", version: 1 }],
            },
          ],
        },
      },
    };
    const result = enrichWithPathMeta(page, docInfo) as any;
    // The single anchor lands on body.root; deep nodes are collapsed.
    expect(result.body.root[META_KEY]).toMatchObject({ path: "body.root", docId: "doc-1" });
    expect(result.body.root.children[0][META_KEY]).toBeUndefined();
    expect(result.body.root.children[0].children[0][META_KEY]).toBeUndefined();
  });
});
