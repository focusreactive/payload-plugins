import type { ClientBlock, ClientField } from "payload";
import { describe, expect, it } from "vitest";
import { walkFields } from "../../../src/content/walk/walkFields";
import type { FieldVisit, FieldVisitContext } from "../../../src/content/walk/walkFields";

const field = (f: Record<string, unknown>) => f as unknown as ClientField;
const block = (b: Record<string, unknown>) => b as unknown as ClientBlock;
const ctx = (o?: Partial<FieldVisitContext>): FieldVisitContext => ({ isUploadCollection: (s) => s === "media", blocksBySlug: {}, ...o });

const visits = (values: Record<string, unknown>, fields: ClientField[], c = ctx()): FieldVisit[] => {
  const out: FieldVisit[] = [];
  walkFields(values, fields, c, (v) => out.push(v));
  return out;
};

describe("walkFields", () => {
  it("reports relationship, upload, and richText leaves with dot-paths", () => {
    const fields = [field({ name: "cover", type: "upload", relationTo: "media" }), field({ name: "author", type: "relationship", relationTo: "users" }), field({ name: "body", type: "richText" })];
    const v = visits({ cover: 1, author: 2, body: { root: {} } }, fields);
    expect(v.map((x) => [x.path, x.field.type])).toEqual([
      ["cover", "upload"],
      ["author", "relationship"],
      ["body", "richText"],
    ]);
    expect(v[0].value).toBe(1);
  });

  it("recurses arrays, blocks, groups, rows, tabs with nested paths", () => {
    const hero = block({ slug: "hero", fields: [field({ name: "image", type: "upload", relationTo: "media" })] });
    const fields = [
      field({ name: "sections", type: "blocks", blocks: [hero] }),
      field({ name: "items", type: "array", fields: [field({ name: "icon", type: "upload", relationTo: "media" })] }),
      field({ name: "meta", type: "group", fields: [field({ name: "rel", type: "relationship", relationTo: "users" })] }),
      field({ type: "row", fields: [field({ name: "rowRel", type: "relationship", relationTo: "users" })] }),
      field({ type: "tabs", tabs: [{ name: "seo", fields: [field({ name: "tabRel", type: "relationship", relationTo: "users" })] }] }),
    ];
    const values = {
      sections: [{ blockType: "hero", image: 1 }],
      items: [{ icon: 2 }],
      meta: { rel: 3 },
      rowRel: 4,
      seo: { tabRel: 5 },
    };
    expect(visits(values, fields).map((x) => x.path)).toEqual(["sections.0.image", "items.0.icon", "meta.rel", "rowRel", "seo.tabRel"]);
  });
});
