import type { Field } from "payload";

interface TabLike { name?: string; fields: Field[] }

interface TabsFieldLike { type: "tabs"; tabs: TabLike[] }

interface FieldsContainer { fields: Field[] }

export function isFieldPathExists(fields: Field[], path: string): boolean {
  const [head, ...rest] = path.split(".");

  for (const field of fields) {
    // Named fields
    if ("name" in field && field.name === head) {
      if (rest.length === 0) {return true;}

      if (
        "fields" in field &&
        Array.isArray((field as unknown as FieldsContainer).fields)
      ) {
        return isFieldPathExists(
          (field as unknown as FieldsContainer).fields,
          rest.join(".")
        );
      }

      return false;
    }

    // Tabs field
    if (field.type === "tabs") {
      const { tabs } = field as unknown as TabsFieldLike;

      for (const tab of tabs) {
        if (tab.name) {
          if (tab.name === head) {
            if (rest.length === 0) {return true;}

            if (isFieldPathExists(tab.fields, rest.join("."))) {return true;}
          }
        } else {
          if (isFieldPathExists(tab.fields, path)) {return true;}
        }
      }
    }

    // Transparent layout fields
    if (
      (field.type === "row" || field.type === "collapsible") &&
      "fields" in field &&
      Array.isArray((field as unknown as FieldsContainer).fields)
    ) {
      if (isFieldPathExists((field as unknown as FieldsContainer).fields, path))
        {return true;}
    }
  }

  return false;
}
