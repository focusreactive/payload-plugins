import type { ClientField } from "payload";
import { describe, expect, it } from "vitest";
import { collectRefs } from "../../../src/content/resolve/collect-refs";
import type { FieldVisitContext } from "../../../src/content/walk/walkFields";

const field = (f: Record<string, unknown>) => f as unknown as ClientField;
const ctx: FieldVisitContext = { isUploadCollection: (s) => s === "media", blocksBySlug: {} };
const none = () => false;

describe("collectRefs", () => {
  it("collects uploads AND regular relationships, tagging kind, mono + poly + hasMany", () => {
    const fields = [
      field({ name: "cover", type: "upload", relationTo: "media" }),
      field({ name: "gallery", type: "upload", relationTo: "media", hasMany: true }),
      field({ name: "author", type: "relationship", relationTo: "users" }),
      field({ name: "poly", type: "relationship", relationTo: ["media", "users"] }),
    ];
    const refs = collectRefs({ cover: 1, gallery: [2, 3], author: 7, poly: { relationTo: "users", value: 8 } }, fields, ctx, none);
    expect(refs).toEqual([
      { collection: "media", id: 1, kind: "upload" },
      { collection: "media", id: 2, kind: "upload" },
      { collection: "media", id: 3, kind: "upload" },
      { collection: "users", id: 7, kind: "relationship" },
      { collection: "users", id: 8, kind: "relationship" },
    ]);
  });

  it("de-dupes by refKey", () => {
    const fields = [field({ name: "a", type: "relationship", relationTo: "users" }), field({ name: "b", type: "relationship", relationTo: "users" })];
    expect(collectRefs({ a: 7, b: 7 }, fields, ctx, none)).toEqual([{ collection: "users", id: 7, kind: "relationship" }]);
  });

  it("respects the excluded predicate (path-pruned before resolve)", () => {
    const fields = [field({ name: "author", type: "relationship", relationTo: "users" })];
    expect(collectRefs({ author: 7 }, fields, ctx, (p) => p === "author")).toEqual([]);
  });

  it("collects lexical inline upload nodes and internal link targets", () => {
    const fields = [field({ name: "body", type: "richText" })];
    const values = {
      body: {
        root: {
          children: [
            { type: "upload", relationTo: "media", value: 9 },
            { type: "link", fields: { linkType: "internal", doc: { relationTo: "posts", value: 11 } }, children: [{ text: "x" }] },
          ],
        },
      },
    };
    expect(collectRefs(values, fields, ctx, none)).toEqual([
      { collection: "media", id: 9, kind: "upload" },
      { collection: "posts", id: 11, kind: "relationship" },
    ]);
  });

  it("skips already-populated objects (only bare ids are refs)", () => {
    const fields = [field({ name: "author", type: "relationship", relationTo: "users" })];
    expect(collectRefs({ author: { id: 7, name: "Jane" } }, fields, ctx, none)).toEqual([]);
  });
});
