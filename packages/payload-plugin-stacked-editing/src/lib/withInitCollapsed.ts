import type { Block, Field } from "payload";

type Tab = { fields: Field[] };

const initCollapsedTransform = {
  block(block: Block): Block {
    return { ...block, fields: initCollapsedTransform.fields(block.fields) };
  },
  fields(fields: Field[]): Field[] {
    return fields.map((field) => initCollapsedTransform.field(field));
  },
  field(field: Field): Field {
    switch (field.type) {
      case "array": {
        return {
          ...field,
          fields: initCollapsedTransform.fields(field.fields),
          admin: { ...field.admin, initCollapsed: field.admin?.initCollapsed ?? true },
        };
      }
      case "blocks": {
        return {
          ...field,
          blocks: field.blocks.map((block) => initCollapsedTransform.block(block)),
          admin: { ...field.admin, initCollapsed: field.admin?.initCollapsed ?? true },
        };
      }
      case "tabs": {
        return {
          ...field,
          tabs: field.tabs.map((tab) => ({
            ...tab,
            fields: initCollapsedTransform.fields((tab as Tab).fields),
          })),
        };
      }
      case "group":
      case "row":
      case "collapsible": {
        return { ...field, fields: initCollapsedTransform.fields(field.fields) } as Field;
      }
      default: {
        return field;
      }
    }
  },
};

export const withInitCollapsedFields = (fields: Field[]): Field[] =>
  initCollapsedTransform.fields(fields);
export const withInitCollapsedBlock = (block: Block): Block => initCollapsedTransform.block(block);
