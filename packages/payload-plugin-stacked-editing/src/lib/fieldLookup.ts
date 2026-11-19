import type { ClientField } from "payload";

export type AnyField = {
  name?: string;
  type: string;
  fields?: ClientField[];
  tabs?: { name?: string; fields: ClientField[] }[];
  options?: (string | { label: unknown; value: string })[];
  labels?: { singular?: unknown; plural?: unknown };
  label?: unknown;
  relationTo?: string | string[];
  admin?: { hidden?: boolean };
  hidden?: boolean;
};

const ROW_INDEX = /^\d+$/u;

const childrenAtSameDataLevel = (field: AnyField): readonly ClientField[] | null => {
  if (field.type === "row" || field.type === "collapsible") {
    return field.fields ?? [];
  }
  if (field.type === "group" && !field.name) {
    return field.fields ?? [];
  }
  if (field.type === "tabs") {
    return (field.tabs ?? []).filter((tab) => !tab.name).flatMap((tab) => tab.fields);
  }
  return null;
};

export const topLevelFields = (fields: readonly ClientField[]): AnyField[] => {
  const result: AnyField[] = [];
  for (const field of fields as unknown as AnyField[]) {
    const children = childrenAtSameDataLevel(field);
    if (children) {
      result.push(...topLevelFields(children));
    } else if (field.name) {
      result.push(field);
    }
  }
  return result;
};

export const visibleTopLevelFields = (fields: readonly ClientField[]): AnyField[] =>
  topLevelFields(fields).filter((field) => !(field.admin?.hidden || field.hidden));

export const fieldAtPath = (fields: readonly ClientField[], path: string): AnyField | undefined => {
  const [head, ...rest] = path.split(".").filter((segment) => !ROW_INDEX.test(segment));
  const field = topLevelFields(fields).find((candidate) => candidate.name === head);
  if (!field || rest.length === 0) {
    return field;
  }
  if (field.type === "group" || field.type === "array") {
    return fieldAtPath(field.fields ?? [], rest.join("."));
  }
  if (field.type === "tabs") {
    const tab = (field.tabs ?? []).find((candidate) => candidate.name === rest[0]);
    return tab ? fieldAtPath(tab.fields, rest.slice(1).join(".")) : undefined;
  }
  return undefined;
};
