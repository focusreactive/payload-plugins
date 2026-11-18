import type {
  ArrayFieldClient,
  BlocksFieldClient,
  ClientBlock,
  ClientField,
  SanitizedFieldsPermissions,
} from "payload";
import { getFieldPaths, getFieldPermissions } from "payload/shared";

import { findBlock } from "./blocks.js";
import { blockRowPermissions, childPermissions, namedTabPermissions } from "./rowPermissions.js";
import type { FieldsPermissions } from "./rowPermissions.js";

export type { FieldsPermissions } from "./rowPermissions.js";

export type CollectionField = ArrayFieldClient | BlocksFieldClient;

export type RowLevel = {
  readonly field: CollectionField;
  readonly fieldPath: string;
  readonly rowIndex: number;
  readonly rowPath: string;
  readonly block?: ClientBlock;
  readonly fields: ClientField[];
  readonly schemaPath: string;
  readonly permissions: SanitizedFieldsPermissions;
  readonly readOnly: boolean;
};

export type ResolveRowChainArgs = {
  readonly fields: ClientField[];
  readonly permissions: FieldsPermissions;
  readonly rowPath: string;
  readonly getBlockType: (args: {
    fieldPath: string;
    rowIndex: number;
    rowPath: string;
  }) => string | undefined;
  readonly blocksMap?: Record<string, ClientBlock>;
  readonly operation?: "create" | "update";
  readonly readOnly?: boolean;
};

export type RowChain = {
  readonly levels: RowLevel[];
  readonly complete: boolean;
};

type Scope = {
  readonly fields: ClientField[];
  readonly parentPath: string;
  readonly parentSchemaPath: string;
  readonly parentIndexPath: string;
  readonly permissions: FieldsPermissions;
  readonly readOnly: boolean;
};

type FieldPaths = ReturnType<typeof getFieldPaths>;

type Visit = {
  readonly args: ResolveRowChainArgs;
  readonly descend: (scope: Scope) => Found;
  readonly scope: Scope;
  readonly paths: FieldPaths;
  readonly fieldPermissions: unknown;
  readonly canOperate: boolean;
};

type Found = { kind: "found"; level: RowLevel } | { kind: "abort" } | { kind: "none" };

const NONE: Found = { kind: "none" };
const ROW_INDEX = /^\d+$/u;

const lastSegment = (path: string): string => path.split(".").at(-1) ?? "";

const leadsInto = (targetPath: string, path: string): boolean => targetPath.startsWith(`${path}.`);

const rowIndexAfter = (targetPath: string, fieldPath: string): number | undefined => {
  const [indexSegment = ""] = targetPath.slice(fieldPath.length + 1).split(".");
  return ROW_INDEX.test(indexSegment) ? Number(indexSegment) : undefined;
};

const sameLevelScope = (scope: Scope, fields: ClientField[], paths: FieldPaths): Scope => ({
  ...scope,
  fields,
  parentIndexPath: paths.indexPath,
});

const rowLevelIn = (field: CollectionField, visit: Visit): Found => {
  const { args, scope, paths } = visit;
  const rowIndex = rowIndexAfter(args.rowPath, paths.path);
  if (rowIndex === undefined) {
    return NONE;
  }
  const rowPath = `${paths.path}.${rowIndex}`;
  const base = {
    field,
    fieldPath: paths.path,
    rowIndex,
    rowPath,
    readOnly: scope.readOnly || !visit.canOperate || Boolean(field.admin?.readOnly),
  };

  if (field.type === "array") {
    const permissions = childPermissions(visit.fieldPermissions) ?? true;
    const level = { ...base, fields: field.fields, schemaPath: paths.schemaPath, permissions };
    return { kind: "found", level };
  }

  const blockType = args.getBlockType({ fieldPath: paths.path, rowIndex, rowPath });
  const block = blockType ? findBlock(field, blockType, args.blocksMap) : undefined;
  if (!block) {
    return { kind: "abort" };
  }
  const level = {
    ...base,
    block,
    fields: block.fields,
    // Payload's Blocks field joins these without a dot; mirrored so panel rows match inline rows.
    schemaPath: `${paths.schemaPath}${block.slug}`,
    permissions: blockRowPermissions(visit.fieldPermissions, block.slug) ?? true,
  };
  return { kind: "found", level };
};

const findInGroup = (field: Extract<ClientField, { type: "group" }>, visit: Visit): Found => {
  const { args, scope, paths } = visit;
  if (!("name" in field) || !field.name) {
    return visit.descend(sameLevelScope(scope, field.fields, paths));
  }
  if (!leadsInto(args.rowPath, paths.path)) {
    return NONE;
  }
  return visit.descend({
    fields: field.fields,
    parentPath: paths.path,
    parentSchemaPath: paths.schemaPath,
    parentIndexPath: "",
    permissions: childPermissions(visit.fieldPermissions),
    readOnly: scope.readOnly || Boolean(field.admin?.readOnly),
  });
};

const findInTabs = (field: Extract<ClientField, { type: "tabs" }>, visit: Visit): Found => {
  const { args, scope, paths } = visit;
  for (const [tabIndex, tab] of field.tabs.entries()) {
    const tabPaths = getFieldPaths({
      field: tab as unknown as ClientField,
      index: tabIndex,
      parentIndexPath: paths.indexPath,
      parentPath: paths.path,
      parentSchemaPath: paths.schemaPath,
    });
    const tabName = "name" in tab && tab.name ? tab.name : undefined;
    if (tabName && !leadsInto(args.rowPath, tabPaths.path)) {
      continue;
    }
    const found = visit.descend({
      fields: tab.fields,
      parentPath: tabPaths.path,
      parentSchemaPath: tabPaths.schemaPath,
      parentIndexPath: tabPaths.indexPath,
      permissions: (tabName
        ? namedTabPermissions(visit.fieldPermissions, tabName)
        : visit.fieldPermissions) as FieldsPermissions,
      readOnly: scope.readOnly,
    });
    if (found.kind !== "none") {
      return found;
    }
  }
  return NONE;
};

const findInField = (field: ClientField, visit: Visit): Found => {
  switch (field.type) {
    case "row":
    case "collapsible": {
      return visit.descend(sameLevelScope(visit.scope, field.fields, visit.paths));
    }
    case "group": {
      return findInGroup(field, visit);
    }
    case "tabs": {
      return findInTabs(field, visit);
    }
    case "array":
    case "blocks": {
      return leadsInto(visit.args.rowPath, visit.paths.path) ? rowLevelIn(field, visit) : NONE;
    }
    default: {
      return NONE;
    }
  }
};

const findRowIn = (args: ResolveRowChainArgs, scope: Scope): Found => {
  const descend = (inner: Scope) => findRowIn(args, inner);
  for (const [index, field] of scope.fields.entries()) {
    const paths = getFieldPaths({
      field,
      index,
      parentIndexPath: scope.parentIndexPath,
      parentPath: scope.parentPath,
      parentSchemaPath: scope.parentSchemaPath,
    });
    const { operation: canOperate, permissions: fieldPermissions } = getFieldPermissions({
      field,
      operation: args.operation ?? "update",
      parentName: lastSegment(scope.parentPath),
      permissions: scope.permissions as SanitizedFieldsPermissions,
    });
    const found = findInField(field, { args, descend, scope, paths, fieldPermissions, canOperate });
    if (found.kind !== "none") {
      return found;
    }
  }
  return NONE;
};

const scopeInsideRow = (level: RowLevel): Scope => ({
  fields: level.fields,
  parentPath: level.rowPath,
  parentSchemaPath: level.schemaPath,
  parentIndexPath: "",
  permissions: level.permissions,
  readOnly: level.readOnly,
});

export const resolveRowChain = (args: ResolveRowChainArgs): RowChain => {
  const levels: RowLevel[] = [];
  let scope: Scope = {
    fields: args.fields,
    parentPath: "",
    parentSchemaPath: "",
    parentIndexPath: "",
    permissions: args.permissions,
    readOnly: Boolean(args.readOnly),
  };

  const maxDepth = args.rowPath.split(".").length;
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const found = findRowIn(args, scope);
    if (found.kind !== "found") {
      return { levels, complete: false };
    }
    levels.push(found.level);
    if (found.level.rowPath === args.rowPath) {
      return { levels, complete: true };
    }
    scope = scopeInsideRow(found.level);
  }
  return { levels, complete: false };
};
