import type {
  ArrayField,
  CollapsibleField,
  Field,
  GroupField,
  RowField,
  TabsField,
} from "payload";

export function flattenFields(fields: Field[]) {
  const result: Field[] = [];

  for (const field of fields) {
    if ("name" in field) {
      result.push(field);
    } else if (field.type === "tabs") {
      result.push(
        ...flattenFields(
          (field as TabsField).tabs.flatMap((t) => t.fields ?? [])
        )
      );
    } else if (field.type === "collapsible" || field.type === "row") {
      result.push(
        ...flattenFields((field as CollapsibleField | RowField).fields)
      );
    }
  }

  return result;
}

export function findFieldByName(
  fields: Field[],
  name: string
): Field | undefined {
  return flattenFields(fields).find(
    (field) => "name" in field && (field as { name: string }).name === name
  );
}

export function getLabelString(field: Field) {
  const f = field as {
    name?: string;
    label?: unknown;
  };

  if (typeof f.label === "string") {return f.label;}

  if (f.label && typeof f.label === "object") {
    const loc = f.label as Record<string, unknown>;
    const val = loc["en"] ?? Object.values(loc)[0];

    if (typeof val === "string") {return val;}
  }

  return f.name ?? "";
}

export function needsDocumentFetch(
  fieldPaths: string[],
  schemaFields: Field[]
): boolean {
  for (const path of fieldPaths) {
    let fields = schemaFields;

    let expectingRowId = false;

    for (const segment of path.split(".")) {
      if (expectingRowId) {return true;}

      const field = findFieldByName(fields, segment);

      if (!field) {break;}

      if (field.type === "array") {
        expectingRowId = true;
        ({ fields } = (field as ArrayField));
      } else if (field.type === "blocks") {
        expectingRowId = true;
        fields = [];
      } else if (field.type === "group") {
        ({ fields } = (field as GroupField));
      } else if (field.type === "tabs") {
        fields = (field as TabsField).tabs.flatMap((t) => t.fields ?? []);
      } else if (field.type === "collapsible" || field.type === "row") {
        ({ fields } = (field as CollapsibleField | RowField));
      } else {
        fields = [];
      }
    }
  }
  return false;
}
