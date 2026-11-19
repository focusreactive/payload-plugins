import type { Config, Field } from "payload";
import { describe, expect, it } from "vitest";

import { withInitCollapsedBlock, withInitCollapsedFields } from "../src/lib/withInitCollapsed.js";
import { stackedEditing } from "../src/plugin.js";

const layout = (): Field[] => [
  { name: "title", type: "text" },
  {
    type: "tabs",
    tabs: [
      {
        label: "Content",
        fields: [
          {
            name: "sections",
            type: "blocks",
            blocks: [
              {
                slug: "features",
                fields: [
                  {
                    type: "row",
                    fields: [
                      { name: "items", type: "array", fields: [{ name: "t", type: "text" }] },
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
  { name: "links", type: "array", admin: { initCollapsed: false }, fields: [] },
];

const sectionsOf = (fields: Field[]) => (fields[1] as any).tabs[0].fields[0];

describe("withInitCollapsed", () => {
  it("collapses arrays and blocks at any depth, but keeps an explicit author choice", () => {
    const fields = withInitCollapsedFields(layout());
    const sections = sectionsOf(fields);
    expect(sections.admin.initCollapsed).toBe(true);
    expect(sections.blocks[0].fields[0].fields[0].admin.initCollapsed).toBe(true);
    expect((fields[2] as any).admin.initCollapsed).toBe(false);
    expect((fields[0] as any).admin).toBeUndefined();
  });

  it("does not mutate the input", () => {
    const input = layout();
    withInitCollapsedFields(input);
    expect(sectionsOf(input).admin).toBeUndefined();
  });

  it("walks config-level blocks", () => {
    const block = withInitCollapsedBlock({
      slug: "cta",
      fields: [{ name: "buttons", type: "array", fields: [] }],
    });
    expect((block.fields[0] as any).admin.initCollapsed).toBe(true);
  });
});

describe("stackedEditing initCollapsed", () => {
  const config = () =>
    ({ collections: [{ slug: "pages", fields: layout() }], globals: [] }) as unknown as Config;

  it("collapses rows on the server in panel mode", async () => {
    const result = await stackedEditing()(config());
    expect(sectionsOf(result.collections![0]!.fields).admin.initCollapsed).toBe(true);
  });

  it("leaves Payload's default in inline mode", async () => {
    const result = await stackedEditing({ defaultMode: "inline", cards: false })(config());
    expect(sectionsOf(result.collections![0]!.fields).admin).toBeUndefined();
  });
});
