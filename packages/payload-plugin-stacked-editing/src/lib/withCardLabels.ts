import type { Block, Field } from "payload";

import { CARD_LABEL_COMPONENT } from "./constants.js";
import { mapBlockTree, mapFieldTree } from "./mapFieldTree.js";
import type { FieldTreeTransform } from "./mapFieldTree.js";

const cardLabels: FieldTreeTransform = {
  array: (field) =>
    field.admin?.components?.RowLabel
      ? field
      : {
          ...field,
          admin: {
            ...field.admin,
            components: { ...field.admin?.components, RowLabel: CARD_LABEL_COMPONENT },
          },
        },
  block: (block) =>
    block.admin?.components?.Label
      ? block
      : {
          ...block,
          admin: {
            ...block.admin,
            components: { ...block.admin?.components, Label: CARD_LABEL_COMPONENT },
          },
        },
};

export const withCardLabelFields = (fields: Field[]): Field[] => mapFieldTree(fields, cardLabels);
export const withCardLabelBlock = (block: Block): Block => mapBlockTree(block, cardLabels);
