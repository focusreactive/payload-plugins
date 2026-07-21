import { describe, it, expect } from "vitest";

import type { FieldLike } from "./types";
import { projectFieldsToFieldLike } from "./projectFieldLike";

describe("projectFieldsToFieldLike", () => {
  it("keeps the whitelisted properties on a leaf and drops everything else", () => {
    const fields = [
      {
        type: "text",
        name: "title",
        localized: true,
        custom: { translateKit: { exclude: false } },
        // properties the pipeline never reads — must not appear on the projection
        required: true,
        admin: { position: "sidebar" },
        validate: () => true,
      },
    ] as unknown as FieldLike[];

    const [leaf] = projectFieldsToFieldLike(fields);

    expect(leaf).toEqual({
      type: "text",
      name: "title",
      localized: true,
      custom: { translateKit: { exclude: false } },
    });
    expect(leaf).not.toHaveProperty("required");
    expect(leaf).not.toHaveProperty("admin");
    expect(leaf).not.toHaveProperty("validate");
  });

  it("is an independent deep copy — Payload's in-place `delete field.localized` on the source does not affect it (the core regression)", () => {
    // A field localized under a localized group: Payload's sanitizer deletes the nested `localized`.
    const nested = { type: "text", name: "body", localized: true } as FieldLike;
    const source: FieldLike[] = [{ type: "group", name: "seo", localized: true, fields: [nested] }];

    const projected = projectFieldsToFieldLike(source);

    // Simulate Payload sanitize mutating the ORIGINAL objects in place.
    delete (source[0] as { localized?: boolean }).localized;
    delete (nested as { localized?: boolean }).localized;
    source[0].fields!.push({ type: "text", name: "injected" });

    const group = projected[0];
    expect(group.localized).toBe(true); // snapshot survived the source mutation
    expect(group.fields).toHaveLength(1); // not affected by the push into the source
    expect(group.fields?.[0]).toEqual({ type: "text", name: "body", localized: true });
    // distinct object identities (deep copy, not shared references)
    expect(group).not.toBe(source[0]);
    expect(group.fields?.[0]).not.toBe(nested);
  });

  it("recurses array element fields (array is handled via the generic `fields` branch, not a special case)", () => {
    const nestedLeaf = { type: "text", name: "label", localized: true } as FieldLike;
    const source: FieldLike[] = [{ type: "array", name: "items", fields: [nestedLeaf] }];

    const projected = projectFieldsToFieldLike(source);

    // Simulate Payload sanitize stripping `localized` off the nested element field in place.
    delete (nestedLeaf as { localized?: boolean }).localized;

    const arrayField = projected[0];
    expect(arrayField.type).toBe("array");
    expect(arrayField.name).toBe("items");
    expect(arrayField.fields).toEqual([{ type: "text", name: "label", localized: true }]);
    expect(arrayField.fields?.[0]).not.toBe(nestedLeaf);
  });

  it("preserves block.slug and recurses block fields (slug is load-bearing for block dispatch)", () => {
    const source: FieldLike[] = [
      {
        type: "blocks",
        name: "sections",
        blocks: [{ slug: "hero", fields: [{ type: "text", name: "heading", localized: true }] }],
      },
    ];

    const [blocksField] = projectFieldsToFieldLike(source);

    expect(blocksField.blocks).toEqual([
      { slug: "hero", fields: [{ type: "text", name: "heading", localized: true }] },
    ]);
    expect(blocksField.blocks?.[0]).not.toBe(source[0].blocks?.[0]);
  });

  it("preserves named and unnamed tabs with their fields", () => {
    const source: FieldLike[] = [
      {
        type: "tabs",
        tabs: [
          { name: "meta", localized: true, fields: [{ type: "text", name: "slug" }] },
          { fields: [{ type: "text", name: "loose", localized: true }] },
        ],
      },
    ];

    const [tabsField] = projectFieldsToFieldLike(source);

    expect(tabsField.tabs).toEqual([
      { name: "meta", localized: true, fields: [{ type: "text", name: "slug" }] },
      { fields: [{ type: "text", name: "loose", localized: true }] },
    ]);
  });

  it("keeps presentational containers (row/collapsible/ui) 1:1 so downstream classification is unchanged", () => {
    const source = [
      { type: "row", fields: [{ type: "text", name: "a" }] },
      { type: "collapsible", fields: [{ type: "text", name: "b" }] },
      { type: "ui", name: "spacer" },
    ] as unknown as FieldLike[];

    const projected = projectFieldsToFieldLike(source);

    expect(projected.map((f) => f.type)).toEqual(["row", "collapsible", "ui"]);
    expect(projected[0].fields).toEqual([{ type: "text", name: "a" }]);
    expect(projected[2]).toEqual({ type: "ui", name: "spacer" });
  });
});
