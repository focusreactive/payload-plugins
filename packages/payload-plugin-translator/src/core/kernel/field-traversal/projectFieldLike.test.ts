import { describe, it, expect } from "vitest";

import type { FieldLike } from "./types";
import { projectFieldsToFieldLike } from "./projectFieldLike";

// Tests are derived from the projection CONTRACT (design doc + Payload field model), not from the
// implementation: the projector must deep-copy exactly { type, name, localized, custom, fields,
// blocks(+slug), tabs(name/localized/fields) }, drop everything else, keep every field 1:1, and be
// independent of later in-place mutation of the source (Payload's `delete field.localized`).

const one = (fields: FieldLike[]): FieldLike => projectFieldsToFieldLike(fields)[0];

describe("projectFieldsToFieldLike — property whitelist (leaf level)", () => {
  it("keeps type, name, localized, and custom", () => {
    const leaf = one([
      {
        type: "text",
        name: "title",
        localized: true,
        custom: { translateKit: { exclude: false } },
      },
    ]);
    expect(leaf).toEqual({
      type: "text",
      name: "title",
      localized: true,
      custom: { translateKit: { exclude: false } },
    });
  });

  it("drops every non-whitelisted property (admin, required, validate, editor, hooks, defaultValue, access)", () => {
    const leaf = one([
      {
        type: "richText",
        name: "body",
        localized: true,
        required: true,
        admin: { position: "sidebar" },
        defaultValue: "x",
        editor: { config: async () => ({}) },
        validate: () => true,
        hooks: { beforeChange: [() => undefined] },
        access: { read: () => true },
      },
    ] as unknown as FieldLike[]);
    expect(leaf).toEqual({ type: "richText", name: "body", localized: true });
    for (const dropped of [
      "required",
      "admin",
      "defaultValue",
      "editor",
      "validate",
      "hooks",
      "access",
    ]) {
      expect(leaf).not.toHaveProperty(dropped);
    }
  });

  it("preserves `localized: false` verbatim (not dropped, not coerced)", () => {
    const leaf = one([{ type: "text", name: "sku", localized: false }]);
    expect(leaf.localized).toBe(false);
    expect(leaf).toEqual({ type: "text", name: "sku", localized: false });
  });

  it("omits name/localized/custom keys when absent on the source", () => {
    const leaf = one([{ type: "text" }]);
    expect(leaf).toEqual({ type: "text" });
    expect(leaf).not.toHaveProperty("name");
    expect(leaf).not.toHaveProperty("localized");
    expect(leaf).not.toHaveProperty("custom");
  });

  it("preserves arbitrary and empty custom contents", () => {
    expect(one([{ type: "text", name: "a", custom: { k: 1, nested: { x: [2] } } }]).custom).toEqual(
      {
        k: 1,
        nested: { x: [2] },
      }
    );
    expect(one([{ type: "text", name: "b", custom: {} }]).custom).toEqual({});
  });
});

describe("projectFieldsToFieldLike — containers (kept 1:1, recursed)", () => {
  it("named group: keeps name, recurses fields", () => {
    expect(
      one([{ type: "group", name: "seo", fields: [{ type: "text", name: "title" }] }])
    ).toEqual({
      type: "group",
      name: "seo",
      fields: [{ type: "text", name: "title" }],
    });
  });

  it("unnamed group: recurses fields, no name", () => {
    const g = one([{ type: "group", fields: [{ type: "text", name: "loose" }] }]);
    expect(g).toEqual({ type: "group", fields: [{ type: "text", name: "loose" }] });
    expect(g).not.toHaveProperty("name");
  });

  it("array: keeps name, recurses element fields", () => {
    expect(
      one([{ type: "array", name: "items", fields: [{ type: "text", name: "label" }] }])
    ).toEqual({
      type: "array",
      name: "items",
      fields: [{ type: "text", name: "label" }],
    });
  });

  it("blocks: keeps name and each block's slug + fields, across multiple blocks", () => {
    expect(
      one([
        {
          type: "blocks",
          name: "sections",
          blocks: [
            { slug: "hero", fields: [{ type: "text", name: "heading", localized: true }] },
            { slug: "cta", fields: [{ type: "text", name: "label" }] },
          ],
        },
      ])
    ).toEqual({
      type: "blocks",
      name: "sections",
      blocks: [
        { slug: "hero", fields: [{ type: "text", name: "heading", localized: true }] },
        { slug: "cta", fields: [{ type: "text", name: "label" }] },
      ],
    });
  });

  it("tabs: keeps named (name/localized/fields) and unnamed (fields) tabs", () => {
    expect(
      one([
        {
          type: "tabs",
          tabs: [
            { name: "meta", localized: true, fields: [{ type: "text", name: "slug" }] },
            { fields: [{ type: "text", name: "loose", localized: true }] },
          ],
        },
      ])
    ).toEqual({
      type: "tabs",
      tabs: [
        { name: "meta", localized: true, fields: [{ type: "text", name: "slug" }] },
        { fields: [{ type: "text", name: "loose", localized: true }] },
      ],
    });
  });

  it("presentational row/collapsible are transparent (fields recursed, no name)", () => {
    const [row, collapsible] = projectFieldsToFieldLike([
      { type: "row", fields: [{ type: "text", name: "a" }] },
      { type: "collapsible", fields: [{ type: "text", name: "b" }] },
    ]);
    expect(row).toEqual({ type: "row", fields: [{ type: "text", name: "a" }] });
    expect(collapsible).toEqual({ type: "collapsible", fields: [{ type: "text", name: "b" }] });
  });

  it("ui field is kept 1:1 with no fields", () => {
    expect(one([{ type: "ui", name: "spacer" } as FieldLike])).toEqual({
      type: "ui",
      name: "spacer",
    });
  });

  it("keeps an empty fields array as [] (does not drop the container)", () => {
    expect(one([{ type: "group", name: "empty", fields: [] }])).toEqual({
      type: "group",
      name: "empty",
      fields: [],
    });
  });

  it("preserves sibling order and count at the root", () => {
    const projected = projectFieldsToFieldLike([
      { type: "text", name: "a" },
      { type: "group", name: "b", fields: [] },
      { type: "ui", name: "c" } as FieldLike,
      { type: "array", name: "d", fields: [] },
    ]);
    expect(projected.map((f) => `${f.type}:${f.name ?? ""}`)).toEqual([
      "text:a",
      "group:b",
      "ui:c",
      "array:d",
    ]);
  });
});

describe("projectFieldsToFieldLike — deep independence (the localized-stripping trap)", () => {
  it("nested `localized` survives Payload's in-place `delete` under a group", () => {
    const leaf = { type: "text", name: "body", localized: true } as FieldLike;
    const source: FieldLike[] = [{ type: "group", name: "g", localized: true, fields: [leaf] }];
    const projected = projectFieldsToFieldLike(source);

    delete (source[0] as { localized?: boolean }).localized;
    delete (leaf as { localized?: boolean }).localized;

    expect(projected[0].localized).toBe(true);
    expect(projected[0].fields?.[0]).toEqual({ type: "text", name: "body", localized: true });
  });

  it("nested `localized` survives under an array element", () => {
    const leaf = { type: "text", name: "label", localized: true } as FieldLike;
    const source: FieldLike[] = [{ type: "array", name: "items", fields: [leaf] }];
    const projected = projectFieldsToFieldLike(source);
    delete (leaf as { localized?: boolean }).localized;
    expect(projected[0].fields?.[0]?.localized).toBe(true);
  });

  it("nested `localized` survives inside a block and under a named tab", () => {
    const blockLeaf = { type: "text", name: "heading", localized: true } as FieldLike;
    const tabLeaf = { type: "text", name: "slug", localized: true } as FieldLike;
    const source: FieldLike[] = [
      { type: "blocks", name: "s", blocks: [{ slug: "hero", fields: [blockLeaf] }] },
      { type: "tabs", tabs: [{ name: "meta", localized: true, fields: [tabLeaf] }] },
    ];
    const projected = projectFieldsToFieldLike(source);
    delete (blockLeaf as { localized?: boolean }).localized;
    delete (tabLeaf as { localized?: boolean }).localized;
    expect(projected[0].blocks?.[0]?.fields?.[0]?.localized).toBe(true);
    expect(projected[1].tabs?.[0]?.fields?.[0]?.localized).toBe(true);
  });

  it("deep mixed nesting (group > array > blocks > named tab > leaf) preserves the bottom `localized`", () => {
    const deepLeaf = { type: "text", name: "text", localized: true } as FieldLike;
    const source: FieldLike[] = [
      {
        type: "group",
        name: "g",
        fields: [
          {
            type: "array",
            name: "rows",
            fields: [
              {
                type: "blocks",
                name: "blk",
                blocks: [
                  {
                    slug: "b",
                    fields: [{ type: "tabs", tabs: [{ name: "t", fields: [deepLeaf] }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const projected = projectFieldsToFieldLike(source);
    delete (deepLeaf as { localized?: boolean }).localized;

    const bottom =
      projected[0].fields?.[0]?.fields?.[0]?.blocks?.[0]?.fields?.[0]?.tabs?.[0]?.fields?.[0];
    expect(bottom).toEqual({ type: "text", name: "text", localized: true });
  });

  it("adding a sibling to the source field list does not affect the projection", () => {
    const source: FieldLike[] = [
      { type: "group", name: "g", fields: [{ type: "text", name: "a" }] },
    ];
    const projected = projectFieldsToFieldLike(source);
    source[0].fields?.push({ type: "text", name: "injected" });
    expect(projected[0].fields).toHaveLength(1);
  });

  it("produces distinct object identities at every level (deep copy, not shared references)", () => {
    const source: FieldLike[] = [
      {
        type: "blocks",
        name: "s",
        blocks: [{ slug: "hero", fields: [{ type: "text", name: "h" }] }],
      },
    ];
    const projected = projectFieldsToFieldLike(source);
    expect(projected[0]).not.toBe(source[0]);
    expect(projected[0].blocks?.[0]).not.toBe(source[0].blocks?.[0]);
    expect(projected[0].blocks?.[0]?.fields?.[0]).not.toBe(source[0].blocks?.[0]?.fields?.[0]);
  });
});
