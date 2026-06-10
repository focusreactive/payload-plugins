import type { ClientBlock, ClientField } from "payload";
import { describe, expect, it } from "vitest";
import { transformUploadValues } from "../../../src/content/uploads/transform-upload-values";
import type { UploadWalkContext } from "../../../src/content/uploads/transform-upload-values";
import type { UploadRef } from "../../../src/content/uploads/types";

const field = (f: Record<string, unknown>) => f as unknown as ClientField;
const block = (b: Record<string, unknown>) => b as unknown as ClientBlock;

const ctx = (overrides?: Partial<UploadWalkContext>): UploadWalkContext => ({
  isUploadCollection: (slug) => slug === "media",
  blocksBySlug: {},
  ...overrides,
});

const collect = (values: Record<string, unknown>, fields: ClientField[], c = ctx()) => {
  const refs: UploadRef[] = [];
  transformUploadValues(values, fields, c, (ref) => {
    refs.push(ref);
    return undefined;
  });

  return refs;
};

describe("transformUploadValues", () => {
  it("visits single, hasMany, and polymorphic upload values", () => {
    const fields = [
      field({ name: "image", type: "upload", relationTo: "media" }),
      field({ name: "gallery", type: "upload", relationTo: "media", hasMany: true }),
      field({ name: "asset", type: "upload", relationTo: ["media", "videos"] }),
    ];
    const refs = collect({ image: 1, gallery: [2, 3], asset: { relationTo: "media", value: 4 } }, fields);

    expect(refs).toEqual([
      { collection: "media", id: 1 },
      { collection: "media", id: 2 },
      { collection: "media", id: 3 },
      { collection: "media", id: 4 },
    ]);
  });

  it("visits relationship fields only when the target collection is upload-enabled", () => {
    const fields = [
      field({ name: "cover", type: "relationship", relationTo: "media" }),
      field({ name: "author", type: "relationship", relationTo: "users" }),
      field({ name: "poly", type: "relationship", relationTo: ["media", "users"] }),
    ];
    const refs = collect({ cover: 5, author: 6, poly: { relationTo: "users", value: 7 } }, fields);

    expect(refs).toEqual([{ collection: "media", id: 5 }]);
  });

  it("recurses blocks (matching blockType), arrays, named/unnamed groups, rows, and tabs", () => {
    const hero = block({
      slug: "hero",
      fields: [field({ name: "image", type: "upload", relationTo: "media" })],
    });
    const fields = [
      field({ name: "sections", type: "blocks", blocks: [hero] }),
      field({ name: "items", type: "array", fields: [field({ name: "icon", type: "upload", relationTo: "media" })] }),
      field({ name: "meta", type: "group", fields: [field({ name: "og", type: "upload", relationTo: "media" })] }),
      field({ type: "row", fields: [field({ name: "rowImg", type: "upload", relationTo: "media" })] }),
      field({
        type: "tabs",
        tabs: [{ name: "seo", fields: [field({ name: "tabImg", type: "upload", relationTo: "media" })] }, { fields: [field({ name: "looseImg", type: "upload", relationTo: "media" })] }],
      }),
    ];
    const values = {
      sections: [
        { blockType: "hero", image: 1 },
        { blockType: "unknown", image: 99 },
      ],
      items: [{ icon: 2 }],
      meta: { og: 3 },
      rowImg: 4,
      seo: { tabImg: 5 },
      looseImg: 6,
    };

    expect(collect(values, fields).map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("resolves block slugs through blockReferences and blocksBySlug", () => {
    const shared = block({ slug: "shared", fields: [field({ name: "pic", type: "upload", relationTo: "media" })] });
    const fields = [field({ name: "sections", type: "blocks", blocks: [], blockReferences: ["shared"] })];
    const refs = collect({ sections: [{ blockType: "shared", pic: 8 }] }, fields, ctx({ blocksBySlug: { shared } }));

    expect(refs).toEqual([{ collection: "media", id: 8 }]);
  });

  it("visits lexical upload nodes inside richText fields", () => {
    const fields = [field({ name: "body", type: "richText" })];
    const values = {
      body: { root: { type: "root", children: [{ type: "upload", relationTo: "media", value: 9 }] } },
    };

    expect(collect(values, fields)).toEqual([{ collection: "media", id: 9 }]);
  });

  it("replaces visited values immutably when the transform returns a replacement", () => {
    const fields = [field({ name: "image", type: "upload", relationTo: "media" })];
    const values = { image: 1, untouched: "x" };
    const doc = { id: 1, url: "/m/a.jpg", mimeType: "image/jpeg", alt: "A" };

    const out = transformUploadValues(values, fields, ctx(), () => doc);

    expect(out.image).toBe(doc);
    expect(out.untouched).toBe("x");
    expect(values.image).toBe(1);
  });

  it("replaces with null when the transform returns null (unresolved drop)", () => {
    const fields = [field({ name: "image", type: "upload", relationTo: "media" })];
    const out = transformUploadValues({ image: "mongo-id" }, fields, ctx(), () => null);

    expect(out.image).toBeNull();
  });

  it("skips missing values and already-populated objects on monomorphic fields", () => {
    const fields = [field({ name: "image", type: "upload", relationTo: "media" }), field({ name: "other", type: "upload", relationTo: "media" })];
    const populated = { id: 1, url: "/m/a.jpg" };
    const refs = collect({ other: populated }, fields);

    expect(refs).toEqual([]);
  });
});
