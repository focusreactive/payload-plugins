import type { ClientBlock, ClientField } from "payload";

export const leafBlock = {
  slug: "leaf",
  labels: { singular: "Leaf", plural: "Leaves" },
  fields: [
    { name: "deepText", type: "text", label: "Deep text" },
    { name: "deepRich", type: "richText", label: "Deep rich" },
  ],
} as unknown as ClientBlock;

export const calloutBlock = {
  slug: "callout",
  labels: { singular: { en: "Callout", de: "Hinweis" }, plural: "Callouts" },
  fields: [{ name: "title", type: "text", label: "Title" }],
} as unknown as ClientBlock;

const innerBlock = {
  slug: "inner",
  labels: { singular: "Inner", plural: "Inner Blocks" },
  fields: [
    { name: "innerText", type: "text", label: "Inner text" },
    { name: "leaves", type: "blocks", label: "Leaves", blocks: [leafBlock] },
  ],
} as unknown as ClientBlock;

const deepNestBlock = {
  slug: "deepNest",
  labels: { singular: "Deep Nest", plural: "Deep Nests" },
  fields: [
    {
      name: "panel",
      type: "group",
      label: "Panel",
      fields: [
        {
          type: "collapsible",
          label: "Panel body",
          fields: [
            {
              type: "row",
              fields: [
                { name: "heading", type: "text", label: "Heading" },
                {
                  name: "chips",
                  type: "array",
                  label: "Chips",
                  labels: { singular: "Chip", plural: "Chips" },
                  fields: [{ name: "label", type: "text", label: "Label" }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "tabs",
      tabs: [
        {
          name: "meta",
          label: "Meta",
          fields: [
            {
              name: "links",
              type: "array",
              label: "Links",
              labels: { singular: "Link", plural: "Links" },
              fields: [{ name: "url", type: "text", label: "URL" }],
            },
          ],
        },
        {
          label: "Body",
          fields: [
            {
              name: "items",
              type: "array",
              label: "Items",
              labels: { singular: "Item", plural: "Items" },
              fields: [
                { name: "label", type: "text", label: "Label" },
                {
                  type: "collapsible",
                  label: "Item body",
                  fields: [
                    {
                      name: "callouts",
                      type: "blocks",
                      label: "Callouts",
                      blocks: [],
                      blockReferences: ["callout"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    { name: "nested", type: "blocks", label: "Nested", blocks: [innerBlock] },
  ],
} as unknown as ClientBlock;

export const documentFields = [
  { name: "title", type: "text", label: "Title" },
  { name: "layout", type: "blocks", label: "Layout", blocks: [deepNestBlock] },
] as unknown as ClientField[];

export const blocksMap: Record<string, ClientBlock> = { callout: calloutBlock };

export const blockTypes: Record<string, string> = {
  "layout.0": "deepNest",
  "layout.0.nested.1": "inner",
  "layout.0.nested.1.leaves.0": "leaf",
  "layout.0.items.2.callouts.0": "callout",
};

export const getBlockType = ({ rowPath }: { rowPath: string }) => blockTypes[rowPath];
