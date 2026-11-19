import type { SanitizedFieldsPermissions } from "payload";

export type FieldsPermissions = SanitizedFieldsPermissions | undefined;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const childPermissions = (permissions: unknown): FieldsPermissions => {
  if (permissions === true) {
    return true;
  }
  return isObject(permissions) ? (permissions.fields as FieldsPermissions) : undefined;
};

const isReadOnlyStructure = (permissions: Record<string, unknown>): boolean => {
  const hasRead = permissions.read === true;
  const missingCreateOrUpdate = !permissions.create || !permissions.update;
  const onlyRead = Object.keys(permissions).length === 1 && permissions.read;
  return hasRead && Boolean(missingCreateOrUpdate || onlyRead);
};

export const blockRowPermissions = (permissions: unknown, blockSlug: string): FieldsPermissions => {
  if (permissions === true) {
    return true;
  }
  if (!isObject(permissions)) {
    return undefined;
  }
  const blocks = permissions.blocks as unknown;
  const specific = isObject(blocks) ? (blocks[blockSlug] ?? blocks) : blocks;
  if (specific === true) {
    return true;
  }
  if (isObject(specific)) {
    return specific.fields as FieldsPermissions;
  }
  if (!specific && isReadOnlyStructure(permissions)) {
    return { read: true } as unknown as FieldsPermissions;
  }
  return undefined;
};

export const namedTabPermissions = (tabsPermissions: unknown, tabName: string): unknown => {
  if (!isObject(tabsPermissions)) {
    return tabsPermissions;
  }
  const entry = tabsPermissions[tabName];
  return isObject(entry) && "fields" in entry ? entry.fields : entry;
};
