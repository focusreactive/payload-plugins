import type { ArrayField, Block, BlocksField, Field } from "payload";

type Tab = { fields: Field[] };

export type FieldTreeTransform = {
  array?: (field: ArrayField) => ArrayField;
  blocks?: (field: BlocksField) => BlocksField;
  block?: (block: Block) => Block;
};

const treeMapper = (transform: FieldTreeTransform) => {
  const mapper = {
    block(block: Block): Block {
      const withChildren = { ...block, fields: mapper.fields(block.fields) };
      return transform.block ? transform.block(withChildren) : withChildren;
    },
    fields(fields: Field[]): Field[] {
      return fields.map((field) => mapper.field(field));
    },
    field(field: Field): Field {
      switch (field.type) {
        case "array": {
          const withChildren = { ...field, fields: mapper.fields(field.fields) };
          return transform.array ? transform.array(withChildren) : withChildren;
        }
        case "blocks": {
          const withChildren = { ...field, blocks: field.blocks.map((b) => mapper.block(b)) };
          return transform.blocks ? transform.blocks(withChildren) : withChildren;
        }
        case "tabs": {
          const tabs = field.tabs.map((tab) => ({
            ...tab,
            fields: mapper.fields((tab as Tab).fields),
          }));
          return { ...field, tabs };
        }
        case "group":
        case "row":
        case "collapsible": {
          return { ...field, fields: mapper.fields(field.fields) } as Field;
        }
        default: {
          return field;
        }
      }
    },
  };
  return mapper;
};

export const mapFieldTree = (fields: Field[], transform: FieldTreeTransform): Field[] =>
  treeMapper(transform).fields(fields);

export const mapBlockTree = (block: Block, transform: FieldTreeTransform): Block =>
  treeMapper(transform).block(block);
