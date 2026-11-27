import { definePreview } from "@focus-reactive/payload-plugin-stacked-editing";
import type { Block, Field } from "payload";

import { embedSectionTab } from "./embedSectionTab";
import type { SectionFieldName } from "./embedSectionTab";
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

interface InjectSectionOptions {
  /** The section's own layout/style options, shown first in its "Look and spacing" tab. */
  lookFields?: Field[];
  /** Shared settings the block's component ignores; hidden so editors only see what works. */
  unusedSectionFields?: readonly SectionFieldName[];
}

export function injectSection(
  block: Block,
  { lookFields = [], unusedSectionFields = [] }: InjectSectionOptions = {}
): Block {
  return withSectionVisibility({
    ...withHeadingPreview(block),
    fields: embedSectionTab(block.fields, lookFields, unusedSectionFields),
  });
}
