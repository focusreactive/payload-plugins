import type { Block, CheckboxField } from "payload";

import { HIDDEN_FIELD_NAME, SECTION_VISIBILITY_LABEL_PATH } from "./constants";

export function withSectionVisibility(block: Block): Block {
  const hiddenField: CheckboxField = {
    name: HIDDEN_FIELD_NAME,
    type: "checkbox",
    defaultValue: false,
    label: "Hidden",
    admin: { hidden: true },
  };

  const alreadyHasField = block.fields.some((field) => "name" in field && field.name === HIDDEN_FIELD_NAME);

  return {
    ...block,
    fields: alreadyHasField ? block.fields : [...block.fields, hiddenField],
    admin: {
      ...block.admin,
      components: {
        ...block.admin?.components,
        Label: SECTION_VISIBILITY_LABEL_PATH,
      },
    },
  };
}
