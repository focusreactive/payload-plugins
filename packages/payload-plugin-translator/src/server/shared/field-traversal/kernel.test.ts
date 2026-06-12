import type { ArrayField, BlocksField, Field, NamedGroupField, RowField, TabsField, TextField, UIField } from "payload";
import { describe, expect, it } from "vitest";

import { classifyField, matchElementById, resolveBlockFields, tabScopes } from "./kernel";

const text = (name: string, extra: Record<string, unknown> = {}): TextField => ({ name, type: "text", ...extra }) as unknown as TextField;

describe("classifyField", () => {
  it("classifies text/textarea/richText leaves as `leaf`", () => {
    const field = text("title");
    expect(classifyField(field)).toEqual({ kind: "leaf", name: "title", field });
  });

  it("classifies a named group as `group`, exposing name + child fields", () => {
    const child = text("title");
    const field = { type: "group", name: "meta", fields: [child] } as unknown as NamedGroupField;
    expect(classifyField(field as unknown as Field)).toEqual({
      kind: "group",
      name: "meta",
      fields: [child],
      field,
    });
  });

  it("classifies an array as `array`", () => {
    const child = text("label");
    const field = { type: "array", name: "items", fields: [child] } as unknown as ArrayField;
    expect(classifyField(field as unknown as Field)).toEqual({
      kind: "array",
      name: "items",
      fields: [child],
      field,
    });
  });

  it("classifies blocks as `blocks` (child fields resolved per-element later)", () => {
    const field = { type: "blocks", name: "content", blocks: [] } as unknown as BlocksField;
    expect(classifyField(field as unknown as Field)).toEqual({ kind: "blocks", name: "content", field });
  });

  it("classifies a presentational container (row) as `transparent` — same data scope", () => {
    const inner = text("title");
    const field = { type: "row", fields: [inner] } as unknown as RowField;
    expect(classifyField(field as unknown as Field)).toEqual({ kind: "transparent", fields: [inner] });
  });

  it("classifies an UNNAMED group as `transparent` (it opens no data boundary)", () => {
    const inner = text("title");
    const field = { type: "group", fields: [inner] } as unknown as Field;
    expect(classifyField(field)).toEqual({ kind: "transparent", fields: [inner] });
  });

  it("classifies a `ui` field as `presentational` (no data, no subfields)", () => {
    const field = { type: "ui", name: "spacer" } as unknown as UIField;
    expect(classifyField(field as unknown as Field)).toEqual({ kind: "presentational" });
  });

  it("classifies a tabs field as `tabs`", () => {
    const field = { type: "tabs", tabs: [] } as unknown as TabsField;
    expect(classifyField(field as unknown as Field)).toEqual({ kind: "tabs", field });
  });
});

describe("classifyField — dispatch order (disambiguation)", () => {
  // These fixtures match more than one predicate; only the CHECK ORDER picks the winner.
  // If classifyField's branches are reordered, exactly these assertions break.

  it("resolves an unnamed group as `transparent`, not `group` (fieldAffectsData gate runs before the group check)", () => {
    // type === 'group' (→ fieldIsGroupType) AND no name (→ !fieldAffectsData). Order decides.
    const field = { type: "group", fields: [text("x")] } as unknown as Field;
    expect(classifyField(field).kind).toBe("transparent");
  });

  it("resolves a tabs field as `tabs`, not `presentational` (tabs is checked before the non-data-affecting branch)", () => {
    // Non-data-affecting and has no `.fields`, so a wrong order would mislabel it `presentational`.
    const field = { type: "tabs", tabs: [{ label: "T", fields: [text("x")] }] } as unknown as Field;
    expect(classifyField(field).kind).toBe("tabs");
  });

  it("resolves a named group as `group`, not `transparent` (the gate lets data-affecting fields through)", () => {
    // Confirms the fieldAffectsData gate does not over-capture: a named group still reaches the group check.
    const field = { type: "group", name: "meta", fields: [text("x")] } as unknown as Field;
    expect(classifyField(field).kind).toBe("group");
  });
});

describe("tabScopes", () => {
  it("flattens named + unnamed tabs, preserving order", () => {
    const a = text("a");
    const b = text("b");
    const field = {
      type: "tabs",
      tabs: [
        { name: "seo", fields: [a] },
        { label: "Layout", fields: [b] },
      ],
    } as unknown as TabsField;

    expect(tabScopes(field)).toEqual([
      { named: true, tab: { name: "seo", fields: [a] } },
      { named: false, fields: [b] },
    ]);
  });
});

describe("resolveBlockFields", () => {
  const hero = text("heading");
  const field = {
    type: "blocks",
    name: "content",
    blocks: [{ slug: "hero", fields: [hero] }],
  } as unknown as BlocksField;

  it("returns the matching block fields by blockType", () => {
    expect(resolveBlockFields(field, { blockType: "hero", heading: "Hi" })).toEqual([hero]);
  });

  it("returns null for an unknown blockType", () => {
    expect(resolveBlockFields(field, { blockType: "unknown" })).toBeNull();
  });

  it("returns null for a non-block item", () => {
    expect(resolveBlockFields(field, "not-an-object")).toBeNull();
    expect(resolveBlockFields(field, { noBlockType: true })).toBeNull();
  });
});

describe("matchElementById", () => {
  it("finds the array element with the matching id, regardless of position", () => {
    const arr = [
      { id: "2", v: "b" },
      { id: "1", v: "a" },
    ];
    expect(matchElementById(arr, { id: "1" }, false)).toEqual({ id: "1", v: "a" });
  });

  it("returns {} when no element shares the id", () => {
    expect(matchElementById([{ id: "1" }], { id: "9" }, false)).toEqual({});
  });

  it("returns {} when the reference element has no usable id (undefined or null)", () => {
    expect(matchElementById([{ id: "1" }], {}, false)).toEqual({});
    expect(matchElementById([{ id: "1" }], { id: null }, false)).toEqual({});
  });

  it("requires blockType to match too when isBlocks is true", () => {
    const arr = [{ id: "1", blockType: "quote", v: "x" }];
    expect(matchElementById(arr, { id: "1", blockType: "text" }, true)).toEqual({}); // same id, wrong type
    expect(matchElementById(arr, { id: "1", blockType: "quote" }, true)).toEqual({ id: "1", blockType: "quote", v: "x" });
  });

  it("ignores non-object candidates", () => {
    expect(matchElementById(["raw", 42, { id: "1", v: "a" }], { id: "1" }, false)).toEqual({ id: "1", v: "a" });
  });
});
