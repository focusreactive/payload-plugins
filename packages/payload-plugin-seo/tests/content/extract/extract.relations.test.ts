import type { ClientField } from "payload";
import { describe, expect, it } from "vitest";
import { extractContent } from "../../../src/content/extract/extract";
import type { ExtractContext } from "../../../src/content/extract/context";
import { refKey } from "../../../src/content/resolve/types";

const field = (f: Record<string, unknown>) => f as unknown as ClientField;

const baseCtx = (over: Partial<ExtractContext>): ExtractContext => ({
  getFields: () => [],
  isUploadCollection: (s) => s === "media",
  slugPath: () => "slug",
  blocksBySlug: {},
  resolved: new Map(),
  baseUrl: "https://x.com",
  ...over,
});

const run = (values: Record<string, unknown>, fields: ClientField[], ctx: ExtractContext, depth: number) =>
  extractContent({ values, fields, ctx, selection: { include: [], exclude: [] }, metadataPaths: [], depth });

describe("extractContent — relationship recursion", () => {
  it("follows a host relationship and extracts the related doc's content (depth 2)", () => {
    const authorFields = [field({ name: "name", type: "text" }), field({ name: "bio", type: "textarea" })];
    const ctx = baseCtx({
      getFields: (slug) => (slug === "users" ? authorFields : []),
      resolved: new Map([[refKey({ collection: "users", id: 7 }), { id: 7, name: "Jane", bio: "Writer" }]]),
    });
    const out = run({ author: 7 }, [field({ name: "author", type: "relationship", relationTo: "users" })], ctx, 2);
    expect(out).toEqual([
      { type: "paragraph", text: "Jane" },
      { type: "paragraph", text: "Writer" },
    ]);
  });

  it("does NOT follow relationships when depth is 0", () => {
    const ctx = baseCtx({ getFields: () => [field({ name: "name", type: "text" })], resolved: new Map([[refKey({ collection: "users", id: 7 }), { name: "Jane" }]]) });
    expect(run({ author: 7 }, [field({ name: "author", type: "relationship", relationTo: "users" })], ctx, 0)).toEqual([]);
  });

  it("stops after one hop at depth 1 (nested relation populated but not followed)", () => {
    const userFields = [field({ name: "name", type: "text" }), field({ name: "manager", type: "relationship", relationTo: "users" })];
    const ctx = baseCtx({
      getFields: () => userFields,
      resolved: new Map([[refKey({ collection: "users", id: 7 }), { name: "Jane", manager: { name: "Boss" } }]]),
    });
    expect(run({ author: 7 }, [field({ name: "author", type: "relationship", relationTo: "users" })], ctx, 1)).toEqual([{ type: "paragraph", text: "Jane" }]);
  });

  it("follows a nested populated relation at depth 2", () => {
    const userFields = [field({ name: "name", type: "text" }), field({ name: "manager", type: "relationship", relationTo: "users" })];
    const ctx = baseCtx({
      getFields: () => userFields,
      resolved: new Map([[refKey({ collection: "users", id: 7 }), { name: "Jane", manager: { name: "Boss" } }]]),
    });
    expect(run({ author: 7 }, [field({ name: "author", type: "relationship", relationTo: "users" })], ctx, 2)).toEqual([
      { type: "paragraph", text: "Jane" },
      { type: "paragraph", text: "Boss" },
    ]);
  });
});
