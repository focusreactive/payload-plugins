import type { Field } from "payload";
import { describe, expect, it } from "vitest";

import { resolveBlockFields } from "./kernel";
import type { FieldWalker, LeafField } from "./types";
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
