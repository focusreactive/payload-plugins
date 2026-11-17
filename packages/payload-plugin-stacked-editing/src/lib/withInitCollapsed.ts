import type { Block, Field } from "payload";

type Tab = { fields: Field[] };

/**
 * Sets Payload's own `admin.initCollapsed: true` on every array and blocks field whose author did not
 * set it, so the server already renders rows as collapsed cards — no flash of expanded rows before
 * the admin hydrates. Payload still prefers the editor's saved collapse preferences over it.
 * Walks into blocks, arrays, groups, rows, collapsibles and tabs.
 */
const collapse = {
  block(block: Block): Block {
    return { ...block, fields: collapse.fields(block.fields) };
  },
  fields(fields: Field[]): Field[] {
    return fields.map((field) => collapse.field(field));
  },
  field(field: Field): Field {
    switch (field.type) {
      case "array": {
        return {
          ...field,
          fields: collapse.fields(field.fields),
          admin: { ...field.admin, initCollapsed: field.admin?.initCollapsed ?? true },
        };
      }
      case "blocks": {
        // Blocks referenced by slug (`blockReferences`) live in `config.blocks`, handled there.
        return {
          ...field,
          blocks: field.blocks.map((block) => collapse.block(block)),
          admin: { ...field.admin, initCollapsed: field.admin?.initCollapsed ?? true },
        };
      }
      case "tabs": {
        return {
          ...field,
          tabs: field.tabs.map((tab) => ({ ...tab, fields: collapse.fields((tab as Tab).fields) })),
        };
      }
      case "group":
      case "row":
      case "collapsible": {
        return { ...field, fields: collapse.fields(field.fields) } as Field;
      }
      default: {
        return field;
      }
    }
  },
};

export const withInitCollapsedFields = (fields: Field[]): Field[] => collapse.fields(fields);
export const withInitCollapsedBlock = (block: Block): Block => collapse.block(block);
