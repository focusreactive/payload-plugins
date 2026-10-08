import { describe, expect, it } from "vitest";

import { resolveContainerChain } from "../src/admin/resolveContainerChain";
import type { ResolverField } from "../src/admin/resolveContainerChain";

describe("resolveContainerChain", () => {
  it("resolves a top-level leaf with no chain", () => {
    const fields: ResolverField[] = [{ type: "text", name: "heading" }];
    expect(resolveContainerChain("heading", fields)).toEqual({
      chain: [],
      fieldId: "field-heading",
    });
  });

  it("descends a named group", () => {
    const fields: ResolverField[] = [
      {
        type: "group",
        name: "hero",
        fields: [{ type: "text", name: "heading" }],
      },
    ];
    expect(resolveContainerChain("hero.heading", fields)).toEqual({
      chain: [],
      fieldId: "field-hero__heading",
    });
  });

  it("emits a tab instruction for a named tab", () => {
    const fields: ResolverField[] = [
      {
        type: "tabs",
        tabs: [
          { fields: [{ type: "text", name: "siteName" }] },
          {
            name: "translation",
            fields: [{ type: "text", name: "privacyPolicy" }],
          },
        ],
      },
    ];
    expect(resolveContainerChain("translation.privacyPolicy", fields)).toEqual({
      chain: [{ kind: "tab", tabIndex: 1 }],
      fieldId: "field-translation__privacyPolicy",
    });
  });

  it("finds a leaf inside an unnamed tab (tab consumes no segment)", () => {
    const fields: ResolverField[] = [
      {
        type: "tabs",
        tabs: [
          { fields: [{ type: "text", name: "defaults" }] },
          { fields: [{ type: "text", name: "advanced" }] },
        ],
      },
    ];
    expect(resolveContainerChain("advanced", fields)).toEqual({
      chain: [{ kind: "tab", tabIndex: 1 }],
      fieldId: "field-advanced",
    });
  });

  it("siteSettings shape: named tab → unnamed group → collapsible → named group → leaf", () => {
    // Mirrors Payload's actual `path` computation: unnamed ancestors
    // accumulate indices with hyphens, producing `_index-0-12` (not
    // `_index-0._index-12`). See getFieldPaths.js in payload core.
    const fields: ResolverField[] = [
      {
        type: "tabs",
        tabs: [
          { fields: [] }, // General (unnamed)
          {
            name: "translation",
            fields: [
              {
                type: "group", // unnamed group, index 0 in tab
                fields: [
                  // 12 siblings before the Forms collapsible.
                  ...Array.from({ length: 12 }, () => ({
                    type: "collapsible",
                    fields: [],
                  })),
                  // Forms collapsible at index 12.
                  {
                    type: "collapsible",
                    fields: [
                      {
                        type: "group",
                        name: "forms",
                        fields: [
                          // translationField returns a row wrapping text + reset.
                          // There are a few preceding ones in real config.
                          { type: "row", fields: [] },
                          {
                            type: "row",
                            fields: [{ type: "text", name: "privacyPolicy" }],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    expect(resolveContainerChain("translation.forms.privacyPolicy", fields)).toEqual({
      chain: [
        { kind: "tab", tabIndex: 1 },
        { kind: "collapsible", path: "translation._index-0-12" },
      ],
      fieldId: "field-translation__forms__privacyPolicy",
    });
  });

  it("emits a row instruction for array index + field", () => {
    const fields: ResolverField[] = [
      {
        type: "array",
        name: "layout",
        fields: [{ type: "text", name: "heading" }],
      },
    ];
    expect(resolveContainerChain("layout.2.heading", fields)).toEqual({
      chain: [{ kind: "row", rowContainerId: "layout-row-2" }],
      fieldId: "field-layout__2__heading",
    });
  });

  it("finds a heading in one of multiple block types", () => {
    const fields: ResolverField[] = [
      {
        type: "blocks",
        name: "layout",
        blocks: [
          { slug: "cta", fields: [{ type: "text", name: "ctaLabel" }] },
          { slug: "hero", fields: [{ type: "text", name: "heading" }] },
        ],
      },
    ];
    expect(resolveContainerChain("layout.0.heading", fields)).toEqual({
      chain: [{ kind: "row", rowContainerId: "layout-row-0" }],
      fieldId: "field-layout__0__heading",
    });
  });

  it("emits tab+row+nested-tab chain for pages layout+block tabs", () => {
    // Pages: top tabs [Hero, Content], Content has `layout` blocks, one block
    // has its own tabs field with nested tab 0 = target location.
    const fields: ResolverField[] = [
      {
        type: "tabs",
        tabs: [
          { fields: [] }, // Hero
          {
            fields: [
              {
                type: "blocks",
                name: "layout",
                blocks: [
                  {
                    slug: "cta",
                    fields: [
                      {
                        type: "tabs",
                        tabs: [{ fields: [{ type: "text", name: "content" }] }, { fields: [] }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    expect(resolveContainerChain("layout.0.content", fields)).toEqual({
      chain: [
        { kind: "tab", tabIndex: 1 },
        { kind: "row", rowContainerId: "layout-row-0" },
        { kind: "tab", tabIndex: 0 },
      ],
      fieldId: "field-layout__0__content",
    });
  });

  it("fieldId is null when the path ends on a row index", () => {
    const fields: ResolverField[] = [
      {
        type: "array",
        name: "layout",
        fields: [{ type: "text", name: "heading" }],
      },
    ];
    const result = resolveContainerChain("layout.2", fields);
    expect(result?.chain).toEqual([{ kind: "row", rowContainerId: "layout-row-2" }]);
    expect(result?.fieldId).toBeNull();
  });

  it("transparent row wrapper does not emit a chain entry", () => {
    const fields: ResolverField[] = [
      {
        type: "row",
        fields: [{ type: "text", name: "heading" }],
      },
    ];
    expect(resolveContainerChain("heading", fields)).toEqual({
      chain: [],
      fieldId: "field-heading",
    });
  });

  it("unnamed group is transparent", () => {
    const fields: ResolverField[] = [
      {
        type: "group",
        fields: [{ type: "text", name: "heading" }],
      },
    ];
    expect(resolveContainerChain("heading", fields)).toEqual({
      chain: [],
      fieldId: "field-heading",
    });
  });

  it("returns null for unresolvable path", () => {
    const fields: ResolverField[] = [{ type: "text", name: "heading" }];
    expect(resolveContainerChain("bogus.nested.path", fields)).toBeNull();
  });
});
