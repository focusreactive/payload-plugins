import type {
  SanitizedDocumentPermissions,
  SanitizedFieldPermissions,
  SanitizedFieldsPermissions,
} from "payload";

import type { FieldStep } from "../../shared/fieldKey.js";

type GrantedField = Exclude<SanitizedFieldPermissions, true>;

const fieldsOfRow = (
  field: GrantedField,
  blockType: string | undefined
): SanitizedFieldsPermissions | undefined => {
  if (blockType === undefined) return field.fields;
  const block = field.blocks === true ? true : field.blocks?.[blockType];
  return block === true ? true : block?.fields;
};

export const mayUpdateFieldAt = (
  permissions: SanitizedDocumentPermissions | undefined,
  steps: readonly FieldStep[]
): boolean => {
  if (!permissions?.update) return false;
  let fields: SanitizedFieldsPermissions | undefined = permissions.fields;
  let field: SanitizedFieldPermissions | undefined;
  for (const step of steps) {
    if (fields === true || field === true) return true;
    if ("name" in step) {
      field = fields?.[step.name];
      fields = field === true ? true : field?.fields;
    } else {
      fields = field && fieldsOfRow(field, step.blockType);
    }
  }
  return field === true || field?.update === true;
};
