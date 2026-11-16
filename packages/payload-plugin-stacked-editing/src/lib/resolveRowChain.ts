import type {
  ArrayFieldClient,
  BlocksFieldClient,
  ClientBlock,
  ClientField,
  SanitizedFieldsPermissions,
} from "payload";
import { getFieldPaths, getFieldPermissions } from "payload/shared";

/**
 * The permissions object Payload hands to `RenderFields` — a map of field name to permissions, or
 * `true` for "everything allowed". Kept loose on purpose: Payload's own containers index into it
 * with a few shapes (`fields`, `blocks[slug].fields`) that its public types do not all spell out.
 */
export type FieldsPermissions = SanitizedFieldsPermissions | undefined;

export type CollectionField = ArrayFieldClient | BlocksFieldClient;

/** One editable row on the way from the document root down to the row a panel shows. */
export type RowLevel = {
  /** The array or blocks field that owns the row. */
  readonly field: CollectionField;
  /** Data path of that field, e.g. `layout.0.nested`. */
  readonly fieldPath: string;
  readonly rowIndex: number;
  /** Data path of the row, e.g. `layout.0.nested.1`. Children render under it. */
  readonly rowPath: string;
  /** The block the row is an instance of (blocks fields only). */
  readonly block?: ClientBlock;
  /** The row's own fields — what Payload's `BlockRow` / `ArrayRow` render inside the row. */
  readonly fields: ClientField[];
  /** `parentSchemaPath` for the row's fields, computed exactly the way Payload computes it. */
  readonly schemaPath: string;
  /** Permissions for the row's fields, computed the way `BlockRow` / `ArrayRow` compute them. */
  readonly permissions: SanitizedFieldsPermissions;
  readonly readOnly: boolean;
};

export type ResolveRowChainArgs = {
  /** Top-level fields of the collection or global (client config). */
  readonly fields: ClientField[];
  /** `docPermissions.fields` — what `DocumentFields` passes to the top-level `RenderFields`. */
  readonly permissions: FieldsPermissions;
  /** Data path of the row to reach, e.g. `layout.0.nested.1`. */
  readonly rowPath: string;
  /** Block slug of the row at `rowPath` in the blocks field at `fieldPath`, read from form state. */
  readonly getBlockType: (args: {
    fieldPath: string;
    rowIndex: number;
    rowPath: string;
  }) => string | undefined;
  /** `config.blocksMap` — where `blockReferences` resolve to. */
  readonly blocksMap?: Record<string, ClientBlock>;
  readonly operation?: "create" | "update";
  readonly readOnly?: boolean;
};

export type RowChain = {
  /** Every row from the outermost to the target, one entry per panel. */
  readonly levels: RowLevel[];
  /** `false` when the walk stopped early (unknown block type, row gone, path not in the schema). */
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

/** `ArrayRow`: `permissions === true ? permissions : permissions?.fields`. */
const childPermissions = (permissions: unknown): FieldsPermissions => {
  if (permissions === true) {
    return true;
  }
  return isObject(permissions) ? (permissions.fields as FieldsPermissions) : undefined;
};

/** Mirrors the permission branch at the top of Payload's `BlockRow`. */
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

/** `blockReferences` (slugs into `config.blocksMap`) or inline `blocks` — as Payload's Blocks field does. */
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

/** Same lookup order as Payload's Blocks field: the config-level map first, then the field's own blocks. */
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
      // Payload's Blocks field passes `schemaPath + blockConfig.slug` (no separator) to BlockRow.
      // Mirrored verbatim so a row rendered in a panel is indistinguishable from the inline one.
      schemaPath: `${paths.schemaPath}${block.slug}`,
      permissions: blockRowPermissions(fieldPermissions, block.slug) ?? true,
      readOnly,
    },
  };
};

/**
 * Walks a field list the way `RenderFields` renders it — same paths, schema paths, index paths and
 * permissions — looking for the array/blocks field that owns the next row on the way to
 * `args.rowPath`.
 */
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
          // Payload's Tabs field: a named tab gets `permissions[tab.name].fields` (or the entry itself).
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

/**
 * Resolves a row data path (`layout.0.nested.1`) to the chain of rows that lead to it, each with the
 * client fields, schema path and permissions Payload itself would render that row's fields with.
 */
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

  // Each iteration descends exactly one row; a path cannot hold more rows than it has segments.
  for (let guard = args.rowPath.split(".").length; guard > 0; guard -= 1) {
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
