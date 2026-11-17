import type { Block, Field } from "payload";

import { CARD_LABEL_COMPONENT } from "./constants.js";

type Tab = { fields: Field[] };

/**
 * Gives every array field without its own `admin.components.RowLabel`, and every block without its
 * own `admin.components.Label`, the plugin's row card. Labels set by the user (or by a plugin that
 * ran earlier) are left alone. Walks into blocks, arrays, groups, rows, collapsibles and tabs.
 */
const cards = {
  block(block: Block): Block {
    return {
      ...block,
      fields: cards.fields(block.fields),
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
    return fields.map((field) => cards.field(field));
  },
  field(field: Field): Field {
    switch (field.type) {
      case "array": {
        return {
          ...field,
          fields: cards.fields(field.fields),
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
        // Blocks referenced by slug (`blockReferences`) live in `config.blocks`, handled there.
        return { ...field, blocks: field.blocks.map((block) => cards.block(block)) };
      }
      case "tabs": {
        return {
          ...field,
          tabs: field.tabs.map((tab) => ({ ...tab, fields: cards.fields((tab as Tab).fields) })),
        };
      }
      case "group":
      case "row":
      case "collapsible": {
        return { ...field, fields: cards.fields(field.fields) } as Field;
      }
      default: {
        return field;
      }
    }
  },
};

export const withCardLabelFields = (fields: Field[]): Field[] => cards.fields(fields);
export const withCardLabelBlock = (block: Block): Block => cards.block(block);
