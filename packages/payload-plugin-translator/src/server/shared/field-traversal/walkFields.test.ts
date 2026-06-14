import type { ArrayField, BlocksField, Field, NamedGroupField, NamedTab } from "payload";
import { describe, expect, it } from "vitest";

import { resolveBlockFields } from "./kernel";
import type { ChildCursor, FieldWalker, LeafField } from "./types";
import { walkFields } from "./walkFields";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const isLocalizedText = (f: LeafField): boolean => (f.type === "text" || f.type === "textarea" || f.type === "richText") && f.localized === true;

describe("walkFields", () => {
  it("build-tree shape (filter): keeps localized leaves, rebuilds structure, drops empties", () => {
    type Cursor = { data: Record<string, unknown> };

    const filterWalker: FieldWalker<Cursor, unknown> = {
      enterObject(field, cursor) {
        const v = cursor.data[field.name];
        return isRecord(v) ? { data: v } : "skip";
      },
      enterList(field, cursor) {
        const v = cursor.data[field.name];
        if (!Array.isArray(v)) return "skip";
        return v.flatMap((item, i) => {
          if (!isRecord(item)) return [];
          const fields = field.type === "blocks" ? resolveBlockFields(field, item) : field.fields;
          return fields ? [{ cursor: { data: item }, fields, key: i }] : [];
        });
      },
      leaf(field, cursor) {
        return isLocalizedText(field) ? cursor.data[field.name] : undefined;
      },
      combine(container, children) {
        if (children.length === 0) return undefined; // drop empty containers
        if (container.kind === "list") return children.map((c) => c.out);
        const obj: Record<string, unknown> = {};
        for (const c of children) obj[c.key] = c.out;
        return obj;
      },
    };

    const schema = [
      {
        type: "group",
        name: "meta",
        fields: [
          { name: "title", type: "text", localized: true },
          { name: "internal", type: "text" },
        ],
      },
      { name: "standalone", type: "text", localized: true },
    ] as unknown as Field[];

    const data = { meta: { title: "Hi", internal: "x" }, standalone: "S" };

    expect(walkFields(schema, { data }, filterWalker)).toEqual({
      meta: { title: "Hi" },
      standalone: "S",
    });
  });

  it("collect shape: flat list with path + indices, combine is a no-op (covers arrays + skip)", () => {
    type Cursor = { data: Record<string, unknown>; path: string[] };

    const collected: Array<{ path: string; value: unknown }> = [];
    const collectWalker: FieldWalker<Cursor, void> = {
      enterObject(field, cursor) {
        const v = cursor.data[field.name];
        return isRecord(v) ? { data: v, path: [...cursor.path, field.name] } : "skip";
      },
      enterList(field, cursor) {
        const v = cursor.data[field.name];
        if (!Array.isArray(v)) return "skip";
        return v.flatMap((item, i) => {
          if (!isRecord(item)) return [];
          const fields = field.type === "blocks" ? resolveBlockFields(field, item) : field.fields;
          return fields ? [{ cursor: { data: item, path: [...cursor.path, field.name, String(i)] }, fields, key: i }] : [];
        });
      },
      leaf(field, cursor) {
        if (isLocalizedText(field)) {
          collected.push({ path: [...cursor.path, field.name].join("."), value: cursor.data[field.name] });
        }
        return undefined;
      },
      combine() {
        return undefined;
      },
    };

    const schema = [
      {
        type: "array",
        name: "items",
        fields: [
          { name: "label", type: "text", localized: true },
          { name: "note", type: "text" },
        ],
      },
    ] as unknown as Field[];

    const data = { items: [{ label: "a", note: "x" }, { label: "b" }] };

    walkFields(schema, { data, path: [] }, collectWalker);

    expect(collected).toEqual([
      { path: "items.0.label", value: "a" },
      { path: "items.1.label", value: "b" },
    ]);
  });
});

// ── instrumentation helpers for deep-nesting / engine-mechanics tests ──

type Cur = { data: Record<string, unknown>; path: string[] };

const stdEnterObject = (field: NamedGroupField | NamedTab, c: Cur): Cur | "skip" => {
  const value = c.data[field.name];
  return isRecord(value) ? { data: value, path: [...c.path, field.name] } : "skip";
};

const stdEnterList = (field: ArrayField | BlocksField, c: Cur): ChildCursor<Cur>[] => {
  const value = c.data[field.name];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const fields = field.type === "blocks" ? resolveBlockFields(field, item) : field.fields;
    return fields ? [{ cursor: { data: item, path: [...c.path, field.name, String(index)] }, fields, key: index }] : [];
  });
};

/** Collect every visited leaf as `path → value`, in visit order. */
const collectLeaves = (schema: Field[], data: Record<string, unknown>): Array<{ path: string; value: unknown }> => {
  const leaves: Array<{ path: string; value: unknown }> = [];
  walkFields<Cur, void>(
    schema,
    { data, path: [] },
    {
      enterObject: stdEnterObject,
      enterList: stdEnterList,
      leaf: (field, c) => {
        leaves.push({ path: [...c.path, field.name].join("."), value: c.data[field.name] });
      },
      combine: () => undefined,
    }
  );
  return leaves;
};

/** Rebuild the full data tree (keep ALL leaves), dropping empty containers, preserving id/blockType. */
const rebuildAll = (schema: Field[], data: Record<string, unknown>): unknown =>
  walkFields<Cur, unknown>(
    schema,
    { data, path: [] },
    {
      enterObject: stdEnterObject,
      enterList: stdEnterList,
      leaf: (field, c) => c.data[field.name],
      combine: (container, children, c) => {
        if (children.length === 0) return undefined;
        if (container.kind === "list") return children.map((child) => child.out);
        const obj: Record<string, unknown> = {};
        for (const child of children) obj[child.key] = child.out;
        if (container.kind === "element") {
          if (c.data.id !== undefined) obj.id = c.data.id;
          if (container.field.type === "blocks") obj.blockType = c.data.blockType;
        }
        return obj;
      },
    }
  );

describe("walkFields — deep nesting & engine mechanics", () => {
  const deepSchema = [
    { name: "title", type: "text" },
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "metaTitle", type: "text" },
        { name: "og", type: "group", fields: [{ name: "ogTitle", type: "text" }] },
      ],
    },
    {
      name: "sections",
      type: "array",
      fields: [
        { name: "heading", type: "text" },
        {
          name: "content",
          type: "blocks",
          blocks: [
            { slug: "text", fields: [{ name: "body", type: "text" }] },
            {
              slug: "cta",
              fields: [
                { name: "label", type: "text" },
                { name: "links", type: "array", fields: [{ name: "url", type: "text" }] },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "tabs",
      tabs: [
        { name: "meta", fields: [{ name: "slug", type: "text" }] },
        {
          label: "More",
          fields: [
            { name: "intro", type: "text" },
            { type: "row", fields: [{ name: "rowField", type: "text" }] },
          ],
        },
      ],
    },
    { type: "ui", name: "spacer" },
  ] as unknown as Field[];

  const deepData = {
    title: "T",
    seo: { metaTitle: "MT", og: { ogTitle: "OG" } },
    sections: [
      {
        id: "s0",
        heading: "H0",
        content: [
          { id: "c0", blockType: "text", body: "B0" },
          {
            id: "c1",
            blockType: "cta",
            label: "L0",
            links: [
              { id: "k0", url: "U0" },
              { id: "k1", url: "U1" },
            ],
          },
        ],
      },
      { id: "s1", heading: "H1", content: [] },
    ],
    meta: { slug: "S" },
    intro: "I",
    rowField: "RF",
  };

  it("descends every container kind with correct paths and visit order (group-in-group, blocks-in-array, array-in-block, named/unnamed tabs, row; ui ignored)", () => {
    expect(collectLeaves(deepSchema, deepData)).toEqual([
      { path: "title", value: "T" },
      { path: "seo.metaTitle", value: "MT" },
      { path: "seo.og.ogTitle", value: "OG" },
      { path: "sections.0.heading", value: "H0" },
      { path: "sections.0.content.0.body", value: "B0" },
      { path: "sections.0.content.1.label", value: "L0" },
      { path: "sections.0.content.1.links.0.url", value: "U0" },
      { path: "sections.0.content.1.links.1.url", value: "U1" },
      { path: "sections.1.heading", value: "H1" },
      { path: "meta.slug", value: "S" },
      { path: "intro", value: "I" },
      { path: "rowField", value: "RF" },
    ]);
  });

  it("reconstructs the full nested tree: named tabs nest, unnamed tabs/rows flatten, empty containers drop, id/blockType preserved", () => {
    expect(rebuildAll(deepSchema, deepData)).toEqual({
      title: "T",
      seo: { metaTitle: "MT", og: { ogTitle: "OG" } },
      sections: [
        {
          id: "s0",
          heading: "H0",
          content: [
            { id: "c0", blockType: "text", body: "B0" },
            {
              id: "c1",
              blockType: "cta",
              label: "L0",
              links: [
                { id: "k0", url: "U0" },
                { id: "k1", url: "U1" },
              ],
            },
          ],
        },
        { id: "s1", heading: "H1" }, // content [] → dropped
      ],
      meta: { slug: "S" }, // named tab → nested under its name
      intro: "I", // unnamed tab → flattened to parent scope
      rowField: "RF", // row → flattened to parent scope
    });
  });

  it("enterObject 'skip' prunes one branch but continues siblings", () => {
    const seen: string[] = [];
    walkFields<Cur, void>(
      deepSchema,
      { data: deepData, path: [] },
      {
        enterObject: (field, c) => (field.name === "seo" ? "skip" : stdEnterObject(field, c)),
        enterList: stdEnterList,
        leaf: (field, c) => {
          seen.push([...c.path, field.name].join("."));
        },
        combine: () => undefined,
      }
    );
    expect(seen).not.toContain("seo.metaTitle");
    expect(seen).not.toContain("seo.og.ogTitle");
    expect(seen).toEqual(expect.arrayContaining(["title", "sections.0.heading", "meta.slug", "intro", "rowField"]));
  });

  it("enterList 'skip' prunes the whole list", () => {
    const seen: string[] = [];
    walkFields<Cur, void>(
      deepSchema,
      { data: deepData, path: [] },
      {
        enterObject: stdEnterObject,
        enterList: (field, c) => (field.name === "sections" ? "skip" : stdEnterList(field, c)),
        leaf: (field, c) => {
          seen.push([...c.path, field.name].join("."));
        },
        combine: () => undefined,
      }
    );
    expect(seen.some((p) => p.startsWith("sections"))).toBe(false);
    expect(seen).toEqual(expect.arrayContaining(["title", "seo.metaTitle", "meta.slug"]));
  });

  it("enterObject 'stop' halts the entire walk and returns undefined", () => {
    const seen: string[] = [];
    const result = walkFields<Cur, unknown>(
      deepSchema,
      { data: deepData, path: [] },
      {
        enterObject: (field, c) => (field.name === "seo" ? "stop" : stdEnterObject(field, c)),
        enterList: stdEnterList,
        leaf: (field, c) => {
          seen.push([...c.path, field.name].join("."));
          return undefined;
        },
        combine: () => ({}),
      }
    );
    expect(result).toBeUndefined();
    expect(seen).toEqual(["title"]); // only the leaf before "seo"; everything after is halted
  });

  it("enterList 'stop' halts the entire walk and returns undefined", () => {
    const seen: string[] = [];
    const result = walkFields<Cur, unknown>(
      deepSchema,
      { data: deepData, path: [] },
      {
        enterObject: stdEnterObject,
        enterList: (field, c) => (field.name === "sections" ? "stop" : stdEnterList(field, c)),
        leaf: (field, c) => {
          seen.push([...c.path, field.name].join("."));
          return undefined;
        },
        combine: () => ({}),
      }
    );
    expect(result).toBeUndefined();
    expect(seen).toEqual(["title", "seo.metaTitle", "seo.og.ogTitle"]); // up to just before "sections"
  });

  it("combine fires bottom-up — children before their container, root last", () => {
    const order: string[] = [];
    const orderSchema = [{ name: "items", type: "array", fields: [{ name: "g", type: "group", fields: [{ name: "x", type: "text" }] }] }] as unknown as Field[];
    walkFields<Cur, unknown>(
      orderSchema,
      { data: { items: [{ g: { x: "v" } }] }, path: [] },
      {
        enterObject: stdEnterObject,
        enterList: stdEnterList,
        leaf: () => undefined,
        combine: (container) => {
          order.push(container.kind === "root" ? "root" : `${container.kind}:${container.key}`);
          return {}; // non-undefined → nothing dropped
        },
      }
    );
    expect(order).toEqual(["object:g", "element:0", "list:items", "root"]);
  });

  it("drops empty containers, cascading up (empty array inside group → group omitted)", () => {
    const schema = [{ name: "wrap", type: "group", fields: [{ name: "list", type: "array", fields: [{ name: "x", type: "text" }] }] }] as unknown as Field[];
    expect(rebuildAll(schema, { wrap: { list: [] } })).toBeUndefined();
  });

  it("returns undefined for an empty schema", () => {
    expect(rebuildAll([], { anything: 1 })).toBeUndefined();
  });
});
