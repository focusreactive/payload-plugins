import type { Block, Field } from "payload";

import { mapBlockTree, mapFieldTree } from "./mapFieldTree.js";
import type { FieldTreeTransform } from "./mapFieldTree.js";

const initCollapsed: FieldTreeTransform = {
  array: (field) => ({
    ...field,
    admin: { ...field.admin, initCollapsed: field.admin?.initCollapsed ?? true },
  }),
  blocks: (field) => ({
    ...field,
    admin: { ...field.admin, initCollapsed: field.admin?.initCollapsed ?? true },
  }),
};

export const withInitCollapsedFields = (fields: Field[]): Field[] =>
  mapFieldTree(fields, initCollapsed);
export const withInitCollapsedBlock = (block: Block): Block => mapBlockTree(block, initCollapsed);
