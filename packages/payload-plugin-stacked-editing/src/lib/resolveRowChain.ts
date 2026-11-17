import type {
  ArrayFieldClient,
  BlocksFieldClient,
  ClientBlock,
  ClientField,
  SanitizedFieldsPermissions,
} from "payload";
import { getFieldPaths, getFieldPermissions } from "payload/shared";

export type FieldsPermissions = SanitizedFieldsPermissions | undefined;

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

const ROW_INDEX = /^\d+$/u;

const lastSegment = (path: string): string => {
  const segments = path.split(".");
  return segments.at(-1) ?? "";
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const childPermissions = (permissions: unknown): FieldsPermissions => {
  if (permissions === true) {
    return true;
  }
  return isObject(permissions) ? (permissions.fields as FieldsPermissions) : undefined;
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
  if (isObject(specific) && specific.fields) {
    return specific.fields as FieldsPermissions;
  }
  if (!specific) {
    const hasRead = permissions.read === true;
    const missingCreateOrUpdate = !permissions.create || !permissions.update;
    const onlyRead = Object.keys(permissions).length === 1 && permissions.read;
    if (hasRead && (missingCreateOrUpdate || onlyRead)) {
      return { read: true } as unknown as FieldsPermissions;
    }
  }
  return isObject(specific) ? (specific.fields as FieldsPermissions) : undefined;
};

export const blocksOf = (
  field: BlocksFieldClient,
  blocksMap: Record<string, ClientBlock> = {}
): ClientBlock[] => {
  if (!field.blockReferences) {
    return field.blocks ?? [];
  }
  const resolved: ClientBlock[] = [];
  for (const reference of field.blockReferences) {
    const block = typeof reference === "string" ? blocksMap[reference] : reference;
    if (block) {
      resolved.push(block as ClientBlock);
    }
  }
  return resolved;
};

export const findBlock = (
  field: BlocksFieldClient,
  blockType: string,
  blocksMap: Record<string, ClientBlock> = {}
): ClientBlock | undefined =>
  blocksMap[blockType] ?? blocksOf(field, blocksMap).find((block) => block.slug === blockType);

type Found = { kind: "found"; level: RowLevel } | { kind: "abort" } | { kind: "none" };

const NONE: Found = { kind: "none" };

const rowLevelOf = (
  args: ResolveRowChainArgs,
  scope: Scope,
  field: CollectionField,
  paths: { path: string; schemaPath: string },
  fieldPermissions: unknown,
  canOperate: boolean
): Found => {
  const rest = args.rowPath.slice(paths.path.length + 1);
  const [indexSegment = ""] = rest.split(".");
  if (!ROW_INDEX.test(indexSegment)) {
    return NONE;
  }
  const rowIndex = Number(indexSegment);
  const rowPath = `${paths.path}.${rowIndex}`;
  const readOnly = scope.readOnly || !canOperate || Boolean(field.admin?.readOnly);

  if (field.type === "array") {
    return {
      kind: "found",
      level: {
        field,
        fieldPath: paths.path,
        rowIndex,
        rowPath,
        fields: field.fields,
        schemaPath: paths.schemaPath,
        permissions: childPermissions(fieldPermissions) ?? true,
        readOnly,
      },
    };
  }

  const blockType = args.getBlockType({ fieldPath: paths.path, rowIndex, rowPath });
  const block = blockType ? findBlock(field, blockType, args.blocksMap) : undefined;
  if (!block) {
    return { kind: "abort" };
  }
  return {
    kind: "found",
    level: {
      field,
      fieldPath: paths.path,
      rowIndex,
      rowPath,
      block,
      fields: block.fields,
      // Payload's Blocks field joins these without a dot; mirrored so panel rows match inline rows.
      schemaPath: `${paths.schemaPath}${block.slug}`,
      permissions: blockRowPermissions(fieldPermissions, block.slug) ?? true,
      readOnly,
    },
  };
};

const findRowIn = (args: ResolveRowChainArgs, scope: Scope): Found => {
  const target = args.rowPath;
  const operation = args.operation ?? "update";

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
      operation,
      parentName: lastSegment(scope.parentPath),
      permissions: scope.permissions as SanitizedFieldsPermissions,
    });

    let found: Found = NONE;
    switch (field.type) {
      case "row":
      case "collapsible": {
        found = findRowIn(args, {
          ...scope,
          fields: field.fields,
          parentIndexPath: paths.indexPath,
        });
        break;
      }
      case "group": {
        if ("name" in field && field.name) {
          if (target.startsWith(`${paths.path}.`)) {
            found = findRowIn(args, {
              fields: field.fields,
              parentPath: paths.path,
              parentSchemaPath: paths.schemaPath,
              parentIndexPath: "",
              permissions: childPermissions(fieldPermissions),
              readOnly: scope.readOnly || Boolean(field.admin?.readOnly),
            });
          }
        } else {
          found = findRowIn(args, {
            ...scope,
            fields: field.fields,
            parentIndexPath: paths.indexPath,
          });
        }
        break;
      }
      case "tabs": {
        for (const [tabIndex, tab] of field.tabs.entries()) {
          const tabPaths = getFieldPaths({
            field: tab as unknown as ClientField,
            index: tabIndex,
            parentIndexPath: paths.indexPath,
            parentPath: paths.path,
            parentSchemaPath: paths.schemaPath,
          });
          const named = "name" in tab && Boolean(tab.name);
          if (named && !target.startsWith(`${tabPaths.path}.`)) {
            continue;
          }
          let tabPermissions: unknown = fieldPermissions;
          const tabsPermissions: unknown = fieldPermissions;
          if (named && isObject(tabsPermissions)) {
            const entry = tabsPermissions[(tab as { name: string }).name];
            tabPermissions = isObject(entry) && "fields" in entry ? entry.fields : entry;
          }
          found = findRowIn(args, {
            fields: tab.fields,
            parentPath: tabPaths.path,
            parentSchemaPath: tabPaths.schemaPath,
            parentIndexPath: tabPaths.indexPath,
            permissions: tabPermissions as FieldsPermissions,
            readOnly: scope.readOnly,
          });
          if (found.kind !== "none") {
            break;
          }
        }
        break;
      }
      case "array":
      case "blocks": {
        if (target.startsWith(`${paths.path}.`)) {
          found = rowLevelOf(args, scope, field, paths, fieldPermissions, canOperate);
        }
        break;
      }
      default: {
        break;
      }
    }
    if (found.kind !== "none") {
      return found;
    }
  }
  return NONE;
};

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
    scope = {
      fields: found.level.fields,
      parentPath: found.level.rowPath,
      parentSchemaPath: found.level.schemaPath,
      parentIndexPath: "",
      permissions: found.level.permissions,
      readOnly: found.level.readOnly,
    };
  }
  return { levels, complete: false };
};
