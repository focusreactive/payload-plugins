import type { Block, Field } from "payload";

import { CARD_LABEL_COMPONENT } from "./constants.js";

type Tab = { fields: Field[] };

const cardLabelTransform = {
  block(block: Block): Block {
    return {
      ...block,
      fields: cardLabelTransform.fields(block.fields),
      ...(block.admin?.components?.Label
        ? {}
        : {
            admin: {
              ...block.admin,
              components: { ...block.admin?.components, Label: CARD_LABEL_COMPONENT },
            },
          }),
    };
  },
  fields(fields: Field[]): Field[] {
    return fields.map((field) => cardLabelTransform.field(field));
  },
  field(field: Field): Field {
    switch (field.type) {
      case "array": {
        return {
          ...field,
          fields: cardLabelTransform.fields(field.fields),
          ...(field.admin?.components?.RowLabel
            ? {}
            : {
                admin: {
                  ...field.admin,
                  components: { ...field.admin?.components, RowLabel: CARD_LABEL_COMPONENT },
                },
              }),
        };
      }
      case "blocks": {
        return { ...field, blocks: field.blocks.map((block) => cardLabelTransform.block(block)) };
      }
      case "tabs": {
        return {
          ...field,
          tabs: field.tabs.map((tab) => ({
            ...tab,
            fields: cardLabelTransform.fields((tab as Tab).fields),
          })),
        };
      }
      case "group":
      case "row":
      case "collapsible": {
        return { ...field, fields: cardLabelTransform.fields(field.fields) } as Field;
      }
      default: {
        return field;
      }
    }
  },
};

export const withCardLabelFields = (fields: Field[]): Field[] => cardLabelTransform.fields(fields);
export const withCardLabelBlock = (block: Block): Block => cardLabelTransform.block(block);
