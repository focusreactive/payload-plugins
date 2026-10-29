import { formatLabels } from "payload";
import type { CollectionConfig, Config, Field } from "payload";

import {
  fixedReservedRootSegments,
  folderOperationsSlug,
  folderRedirectsSlug,
  injectedPageFieldNames,
  redirectsPluginSlug,
  treeStateSlug,
} from "./constants.js";
import type {
  FoldersPluginOptions,
  PageCollectionOptions,
  ResolvedOptions,
  ResolvedPageCollection,
} from "./types.js";

const defaultMaxDepth = 20;
const defaultPageSize = 100;
const maximumPageSize = 1000;
const defaultLimits = { maxFoldersPerMove: 2000, maxItemsPerMove: 500, maxSyncDocuments: 200 };

/** Thrown once, listing every configuration error found, so a host fixes them in one pass. */
export class FoldersConfigError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(
      `@focus-reactive/payload-plugin-folders: invalid configuration\n${problems
        .map((problem) => `- ${problem}`)
        .join("\n")}`
    );
    this.name = "FoldersConfigError";
    this.problems = problems;
  }
}

type FieldWithName = Field & { name: string };

/**
 * Names that end up at the top level of the document: layout-only fields (row, collapsible,
 * unnamed tabs) are looked through, named groups and tabs count as one name.
 */
const collectDataFields = (fields: Field[]): FieldWithName[] => {
  const dataFields: FieldWithName[] = [];

  for (const field of fields) {
    if (field.type === "tabs") {
      for (const tab of field.tabs) {
        if ("name" in tab && typeof tab.name === "string") {
          dataFields.push({ name: tab.name, type: "group", fields: [] });
        } else {
          dataFields.push(...collectDataFields(tab.fields));
        }
      }
    } else if (field.type === "row" || field.type === "collapsible") {
      dataFields.push(...collectDataFields(field.fields));
    } else if ("name" in field && typeof field.name === "string") {
      dataFields.push(field as FieldWithName);
    }
  }

  return dataFields;
};

const normalizeSegmentList = (segments: string[]): string[] =>
  segments
    .map((segment) =>
      segment
        .trim()
        .toLowerCase()
        .replaceAll(/^\/+|\/+$/gu, "")
    )
    .filter((segment) => segment !== "");

const firstSegmentOf = (route: string | undefined): string | undefined =>
  normalizeSegmentList([route ?? ""])[0]?.split("/")[0];

const deriveReservedRootSegments = (config: Config, hostSegments: string[]): string[] => {
  const derived = [
    firstSegmentOf(config.routes?.admin ?? "/admin"),
    firstSegmentOf(config.routes?.api ?? "/api"),
    firstSegmentOf(config.routes?.graphQL ?? "/graphql"),
    firstSegmentOf(config.routes?.graphQLPlayground ?? "/graphql-playground"),
    ...fixedReservedRootSegments,
    ...normalizeSegmentList(hostSegments),
  ];

  return [...new Set(derived.filter((segment): segment is string => segment !== undefined))];
};

const resolveLabel = (collection: CollectionConfig, label: string | undefined): string => {
  if (label !== undefined) {
    return label;
  }
  const singular = collection.labels?.singular;
  if (typeof singular === "string") {
    return singular;
  }
  if (singular && typeof singular === "object") {
    const firstTranslation = Object.values(singular)[0];
    if (typeof firstTranslation === "string") {
      return firstTranslation;
    }
  }

  return formatLabels(collection.slug).singular;
};

const resolveTitleField = (
  collection: CollectionConfig,
  dataFields: FieldWithName[],
  titleField: string | undefined
): string => {
  if (titleField !== undefined) {
    return titleField;
  }
  if (collection.admin?.useAsTitle) {
    return collection.admin.useAsTitle;
  }

  return dataFields.some((field) => field.name === "title") ? "title" : "id";
};

/** Fields plugin-nested-docs adds: a `parent` relationship to the collection itself and `breadcrumbs`. */
const hasNestedDocsFields = (collection: CollectionConfig, dataFields: FieldWithName[]): boolean =>
  dataFields.some((field) => field.name === "breadcrumbs" && field.type === "array") &&
  dataFields.some(
    (field) =>
      field.name === "parent" &&
      field.type === "relationship" &&
      field.relationTo === collection.slug
  );

type AdapterInspection = {
  name: string | undefined;
  /** `undefined` when the adapter cannot be asked without connecting. */
  transactionsEnabled: boolean | undefined;
};

/**
 * Reads what the adapter result exposes before Payload has a `payload` instance: `name` is set by
 * every official adapter. Transaction settings live only on the instance, so the SQLite check
 * builds one with a stub: `init` connects nothing, `connect` runs later.
 */
const inspectDatabaseAdapter = (db: Config["db"] | undefined): AdapterInspection => {
  const name = db?.name;
  if (name !== "sqlite" || typeof db?.init !== "function") {
    return { name, transactionsEnabled: undefined };
  }
  try {
    const stubPayload = { logger: { warn: () => undefined } } as never;
    const instance = db.init({ payload: stubPayload }) as { transactionOptions?: unknown };

    return { name, transactionsEnabled: Boolean(instance.transactionOptions) };
  } catch {
    return { name, transactionsEnabled: undefined };
  }
};

const isMongoAdapterName = (name: string | undefined): boolean =>
  name !== undefined && /mongo/iu.test(name);

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;

type CollectionResolution = {
  problems: string[];
  resolved?: ResolvedPageCollection;
  warnings: string[];
};

const resolvePageCollection = ({
  config,
  foldersSlug,
  localizeSegments,
  pageOptions,
  slug,
}: {
  config: Config;
  foldersSlug: string;
  localizeSegments: boolean;
  pageOptions: true | PageCollectionOptions;
  slug: string;
}): CollectionResolution => {
  const problems: string[] = [];
  const warnings: string[] = [];
  const collection = config.collections?.find((candidate) => candidate.slug === slug);
  if (!collection) {
    problems.push(
      `collections.${slug}: no collection with this slug is in the config. Add it to \`collections\`, or remove the key. Collections added by plugins that run after this one are not visible yet.`
    );

    return { problems, warnings };
  }
  if (slug === foldersSlug) {
    problems.push(`collections.${slug}: the folders collection cannot also be a page collection.`);

    return { problems, warnings };
  }

  const options = pageOptions === true ? {} : pageOptions;
  const segmentField = options.segmentField ?? "slug";
  const dataFields = collectDataFields(collection.fields);

  for (const reservedName of injectedPageFieldNames) {
    if (dataFields.some((field) => field.name === reservedName)) {
      problems.push(
        `collections.${slug}: the field "${reservedName}" is reserved by the folders plugin. Rename it.`
      );
    }
  }

  const coreFolderField = dataFields.find(
    (field) =>
      field.name.startsWith("_h_") &&
      field.type === "relationship" &&
      [field.relationTo]
        .flat()
        .some((target) => config.collections?.find((other) => other.slug === target)?.folders)
  );
  if (coreFolderField) {
    problems.push(
      `collections.${slug}: the field "${coreFolderField.name}" is a Payload core folder field. Remove it: this plugin keeps its own folder collection, and the two cannot share a collection.`
    );
  }

  const existingSegmentField = dataFields.find((field) => field.name === segmentField);
  if (existingSegmentField && existingSegmentField.type !== "text") {
    problems.push(
      `collections.${slug}: segmentField "${segmentField}" must be a text field, found "${existingSegmentField.type}".`
    );
  }

  const segmentFieldWasUnique = Boolean(
    existingSegmentField && "unique" in existingSegmentField && existingSegmentField.unique
  );
  if (segmentFieldWasUnique) {
    warnings.push(
      `collections.${slug}: the "${segmentField}" field is unique, but the same segment must be allowed in two folders. The plugin removes \`unique\` and keeps the index; the next migration drops the unique index.`
    );
  }
  if (hasNestedDocsFields(collection, dataFields)) {
    warnings.push(
      `collections.${slug}: it has plugin-nested-docs fields (parent, breadcrumbs). They keep working but ignore folders, so use only one of the two to build URLs.`
    );
  }

  const segmentLocalized =
    Boolean(config.localization) &&
    (existingSegmentField
      ? "localized" in existingSegmentField && Boolean(existingSegmentField.localized)
      : localizeSegments);

  return {
    problems,
    resolved: {
      label: resolveLabel(collection, options.label),
      segmentField,
      segmentFieldExists: existingSegmentField !== undefined,
      segmentFieldWasUnique,
      segmentLocalized,
      slug,
      titleField: resolveTitleField(collection, dataFields, options.titleField),
      trash: Boolean(collection.trash),
    },
    warnings,
  };
};

/**
 * Applies every default and runs every config-time check. Throws a `FoldersConfigError` listing all
 * errors; warnings come back in `warnings`. It reads the config and never changes it.
 */
export const normalizeOptions = (
  options: FoldersPluginOptions,
  config: Config
): ResolvedOptions => {
  const problems: string[] = [];
  const warnings: string[] = [];

  const foldersSlug = options.folders?.slug ?? "folders";
  const localizeSegments = options.localizeSegments ?? Boolean(config.localization);
  if (options.localizeSegments && !config.localization) {
    problems.push("localizeSegments is true, but the config has no `localization`.");
  }

  for (const [kind, ownSlug, existingSlugs] of [
    ["collection", foldersSlug, config.collections?.map((collection) => collection.slug)],
    ["collection", folderRedirectsSlug, config.collections?.map((collection) => collection.slug)],
    ["collection", folderOperationsSlug, config.collections?.map((collection) => collection.slug)],
    ["global", treeStateSlug, config.globals?.map((global) => global.slug)],
  ] as const) {
    if (existingSlugs?.includes(ownSlug)) {
      problems.push(
        ownSlug === foldersSlug
          ? `folders.slug "${ownSlug}" is already used by a collection in the config. Choose another with \`folders.slug\`.`
          : `The ${kind} slug "${ownSlug}" belongs to the folders plugin, but the config already has one with that slug.`
      );
    }
  }

  const collections: Record<string, ResolvedPageCollection> = {};
  for (const [slug, pageOptions] of Object.entries(options.collections)) {
    if (!pageOptions) {
      continue;
    }
    const resolution = resolvePageCollection({
      config,
      foldersSlug,
      localizeSegments,
      pageOptions,
      slug,
    });
    problems.push(...resolution.problems);
    warnings.push(...resolution.warnings);
    if (resolution.resolved) {
      collections[slug] = resolution.resolved;
    }
  }

  const adapter = inspectDatabaseAdapter(config.db);
  if (isMongoAdapterName(adapter.name)) {
    problems.push(
      "MongoDB is not supported: the plugin needs relational transactions and partial version writes. Use the Postgres or SQLite adapter."
    );
  }
  if (adapter.name === "sqlite" && adapter.transactionsEnabled === false) {
    warnings.push(
      "The SQLite adapter has no `transactionOptions`, so its transactions do nothing and a failed move can leave half its writes. Pass `transactionOptions: {}` to sqliteAdapter()."
    );
  }

  const mirrorToRedirectsPlugin = options.redirects?.mirrorToRedirectsPlugin ?? false;
  if (
    mirrorToRedirectsPlugin &&
    !config.plugins?.some((plugin) => (plugin as { slug?: string }).slug === redirectsPluginSlug)
  ) {
    problems.push(
      `redirects.mirrorToRedirectsPlugin needs ${redirectsPluginSlug} registered in \`plugins\`.`
    );
  }

  const maxDepth = options.maxDepth ?? defaultMaxDepth;
  const limits = { ...defaultLimits, ...options.limits };
  if (!isPositiveInteger(maxDepth)) {
    problems.push(`maxDepth must be a positive whole number, got ${maxDepth}.`);
  }
  for (const [name, value] of Object.entries(limits)) {
    if (!isPositiveInteger(value)) {
      problems.push(`limits.${name} must be a positive whole number, got ${value}.`);
    }
  }
  const requestedPageSize = options.admin?.pageSize ?? defaultPageSize;
  if (!isPositiveInteger(requestedPageSize)) {
    problems.push(`admin.pageSize must be a positive whole number, got ${requestedPageSize}.`);
  }

  if (problems.length > 0) {
    throw new FoldersConfigError(problems);
  }

  const sidebarTab = options.admin?.sidebarTab;

  return {
    access: { move: options.access?.move, repair: options.access?.repair },
    admin: {
      confirmMoves: options.admin?.confirmMoves ?? "urlChange",
      pageSize: Math.min(requestedPageSize, maximumPageSize),
      previewUrl: options.admin?.previewUrl,
      sidebarTab: sidebarTab === false ? false : { label: sidebarTab?.label ?? "Tree" },
      treeView: options.admin?.treeView ?? true,
    },
    collections,
    disabled: options.disabled ?? false,
    enforceAllowedTypesOnMove: options.enforceAllowedTypesOnMove ?? true,
    folders: {
      access: options.folders?.access,
      labels: {
        plural: options.folders?.labels?.plural ?? "Content",
        singular: options.folders?.labels?.singular ?? "Folder",
      },
      overrides: options.folders?.overrides,
      slug: foldersSlug,
      trash:
        Object.keys(collections).length > 0 &&
        Object.values(collections).every((collection) => collection.trash),
    },
    hooks: { afterPathChange: options.hooks?.afterPathChange },
    limits,
    localizeSegments,
    maxDepth,
    newItemPosition: options.newItemPosition ?? "top",
    redirects: { enabled: options.redirects?.enabled ?? true, mirrorToRedirectsPlugin },
    reservedRootSegments: deriveReservedRootSegments(config, options.reservedRootSegments ?? []),
    urls: { localePrefix: options.urls?.localePrefix ?? "non-default" },
    warnings,
  };
};

/**
 * Returns the host's collections with `unique` removed from segment fields that had it
 * (spec section 2.4). The input collections are not modified.
 */
export const stripUniqueFromSegmentFields = (
  collections: CollectionConfig[],
  options: ResolvedOptions
): CollectionConfig[] =>
  collections.map((collection) => {
    const resolved = options.collections[collection.slug];
    if (!resolved?.segmentFieldWasUnique) {
      return collection;
    }

    const withoutUnique = (fields: Field[]): Field[] =>
      fields.map((field): Field => {
        if (field.type === "tabs") {
          return {
            ...field,
            tabs: field.tabs.map((tab) =>
              "name" in tab && typeof tab.name === "string"
                ? tab
                : { ...tab, fields: withoutUnique(tab.fields) }
            ),
          };
        }
        if (field.type === "row" || field.type === "collapsible") {
          return { ...field, fields: withoutUnique(field.fields) };
        }
        if ("name" in field && field.name === resolved.segmentField && "unique" in field) {
          const { unique: _unique, ...rest } = field;

          return rest as Field;
        }

        return field;
      });

    return { ...collection, fields: withoutUnique(collection.fields) };
  });
