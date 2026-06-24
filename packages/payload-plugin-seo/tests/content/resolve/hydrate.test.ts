import type { ClientField } from "payload";
import { describe, expect, it } from "vitest";
import { hydrate } from "../../../src/content/resolve/hydrate";
import type { FieldVisitContext } from "../../../src/content/walk/walkFields";
import { refKey } from "../../../src/content/resolve/types";

const field = (f: Record<string, unknown>) => f as unknown as ClientField;
const ctx: FieldVisitContext = { isUploadCollection: (s) => s === "media", blocksBySlug: {} };

describe("hydrate (override path)", () => {
  it("replaces upload + relationship refs with resolved docs", () => {
    const resolved = new Map([
      [refKey({ collection: "media", id: 1 }), { url: "/a.jpg", mimeType: "image/jpeg" }],
      [refKey({ collection: "users", id: 7 }), { id: 7, name: "Jane" }],
    ]);
    const fields = [field({ name: "cover", type: "upload", relationTo: "media" }), field({ name: "author", type: "relationship", relationTo: "users" })];
    const out = hydrate({ cover: 1, author: 7 }, fields, ctx, resolved);
    expect(out.cover).toEqual({ url: "/a.jpg", mimeType: "image/jpeg" });
    expect(out.author).toEqual({ id: 7, name: "Jane" });
  });

  it("nulls unresolved/unrenderable refs", () => {
    const fields = [field({ name: "cover", type: "upload", relationTo: "media" }), field({ name: "author", type: "relationship", relationTo: "users" })];
    const out = hydrate({ cover: 99, author: 99 }, fields, ctx, new Map());
    expect(out.cover).toBeNull();
    expect(out.author).toBeNull();
  });
});
