import { definePreview } from "@focus-reactive/payload-plugin-stacked-editing";
import type { Block } from "payload";

import { embedSectionTab } from "./embedSectionTab";
import { withSectionVisibility } from "./withSectionVisibility";

const HEADING_FIELD_NAME = "heading";

const hasHeadingGroup = (block: Block) =>
  block.fields.some(
    (field) => field.type === "group" && "name" in field && field.name === HEADING_FIELD_NAME
  );

// The row card's default title is the first text field at the row's own level, which misses a
// section's title (it sits in the named `heading` group) and picks e.g. the hero's variant
// instead. Sections with a heading show its title; a block's own preview config wins.
const withHeadingPreview = (block: Block): Block =>
  block.admin?.custom?.preview || !hasHeadingGroup(block)
    ? block
    : {
        ...block,
        admin: {
          ...block.admin,
          custom: {
            ...block.admin?.custom,
            preview: definePreview({ title: `${HEADING_FIELD_NAME}.title` }),
          },
        },
      };

export function injectSection(block: Block): Block {
  return withSectionVisibility({
    ...withHeadingPreview(block),
    fields: embedSectionTab(block.fields),
  });
}
