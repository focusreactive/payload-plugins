import type { CollectionConfig, CollectionSlug, PayloadRequest } from "payload";

import type { LocalePrefixMode } from "./core/paths.js";

export type { LocalePrefixMode } from "./core/paths.js";

export type ItemRef = { collection: string; id: number | string };
export type FolderId = number | string;

export type PathChange = {
  collection: string;
  id: number | string;
  kind: "folder" | "page";
  /** `null` when localization is off. */
  locale: string | null;
  /** `null` on create. */
  from: string | null;
  /** `null` on delete. */
  to: string | null;
  /** `false` when only a draft's path changed. */
  published: boolean;
};

export type PathChangeReason =
  | "create"
  | "move"
  | "folderUpdate"
  | "publish"
  | "rootToggle"
  | "delete"
  | "repair";

export type PageCollectionOptions = {
  /** Field holding the page's segment. Added as a text field if the collection lacks it. */
  segmentField?: string;
  /** Field used as the page's name in the tree. */
  titleField?: string;
  /** Name in the Create menu and the Type column. */
  label?: string;
};

export type FoldersPluginOptions = {
  /** Opted-in page collections, keyed by slug. */
  collections: Partial<Record<CollectionSlug, true | PageCollectionOptions>>;
  folders?: {
    /** Default `folders`. */
    slug?: string;
    /** Default `Folder` / `Content`. */
    labels?: { singular?: string; plural?: string };
    /** Merged over the defaults in spec section 9. */
    access?: CollectionConfig["access"];
    overrides?: (collection: CollectionConfig) => CollectionConfig;
  };
  /** Default 20. */
  maxDepth?: number;
  /** Added to the defaults derived from `config.routes`. */
  reservedRootSegments?: string[];
  /** Default `top`. */
  newItemPosition?: "top" | "bottom";
  /** Default true; false turns blocks into warnings. */
  enforceAllowedTypesOnMove?: boolean;
  /** Default true when `config.localization` is set. */
  localizeSegments?: boolean;
  limits?: {
    /** Default 500 selected items. */
    maxItemsPerMove?: number;
    /** Default 2000 folder rows rewritten by one move or rename. */
    maxFoldersPerMove?: number;
    /** Default 200; above it publish, delete, duplicate and mirror run in batches. */
    maxSyncDocuments?: number;
  };
  urls?: {
    /** How locale prefixes are added by buildUrl() and mirrored redirect rows. Never stored. Default `non-default`. */
    localePrefix?: LocalePrefixMode;
  };
  redirects?: {
    /** Default true; the confirm dialog can still untick it per move. */
    enabled?: boolean;
    /** Also write rows into @payloadcms/plugin-redirects. Needs that plugin registered. Default false. */
    mirrorToRedirectsPlugin?: boolean;
  };
  access?: {
    /** Extra gate on every move, after update and publish access passed. */
    move?: (args: {
      req: PayloadRequest;
      items: ItemRef[];
      toFolder: FolderId | null;
    }) => boolean | Promise<boolean>;
    /**
     * Who may run verify-and-repair and the "Rebuild full URLs" action. Default: users for whom
     * `folders.access.update` passes and `access.move` passes with every item (spec section 9).
     */
    repair?: (args: { req: PayloadRequest }) => boolean | Promise<boolean>;
  };
  hooks?: {
    /** Runs after commit with every full path that changed. Errors are logged, not thrown. */
    afterPathChange?: (args: {
      changes: PathChange[];
      reason: PathChangeReason;
      req: PayloadRequest;
    }) => void | Promise<void>;
  };
  admin?: {
    /** Default true; false keeps the stock folders list view. */
    treeView?: boolean;
    /** Default `{ label: 'Tree' }`; Payload 4 only. */
    sidebarTab?: false | { label?: string };
    /** Default `urlChange`. */
    confirmMoves?: "urlChange" | "always" | "never";
    /** Default 100, max 1000. */
    pageSize?: number;
    /** Builds the "View page" link. Default: none, the menu item is hidden. */
    previewUrl?: (args: { fullPath: string; locale: string | null; collection: string }) => string;
  };
  /** Keeps the schema, removes hooks, endpoints and UI. Run repairTree() after turning it back on. */
  disabled?: boolean;
};

export type ResolvedPageCollection = {
  slug: string;
  segmentField: string;
  titleField: string;
  label: string;
  /** False when the plugin has to add the segment field. */
  segmentFieldExists: boolean;
  /** Whether the segment field, and with it `pathSegment`, is localized. */
  segmentLocalized: boolean;
  /** The host's segment field carried `unique: true`, which the plugin removes. */
  segmentFieldWasUnique: boolean;
  trash: boolean;
};

export type ResolvedOptions = {
  /** Resolved page collections, keyed by slug, in the order the host listed them. */
  collections: Record<string, ResolvedPageCollection>;
  folders: {
    slug: string;
    labels: { singular: string; plural: string };
    access: CollectionConfig["access"] | undefined;
    overrides: ((collection: CollectionConfig) => CollectionConfig) | undefined;
    /** True only when every opted-in collection has `trash: true`. */
    trash: boolean;
  };
  maxDepth: number;
  reservedRootSegments: string[];
  newItemPosition: "top" | "bottom";
  enforceAllowedTypesOnMove: boolean;
  /** Folder names and slugs, and added segment fields, are localized. */
  localizeSegments: boolean;
  limits: { maxItemsPerMove: number; maxFoldersPerMove: number; maxSyncDocuments: number };
  urls: { localePrefix: LocalePrefixMode };
  redirects: { enabled: boolean; mirrorToRedirectsPlugin: boolean };
  access: {
    move: NonNullable<FoldersPluginOptions["access"]>["move"];
    repair: NonNullable<FoldersPluginOptions["access"]>["repair"];
  };
  hooks: { afterPathChange: NonNullable<FoldersPluginOptions["hooks"]>["afterPathChange"] };
  admin: {
    treeView: boolean;
    sidebarTab: false | { label: string };
    confirmMoves: "urlChange" | "always" | "never";
    pageSize: number;
    previewUrl: NonNullable<FoldersPluginOptions["admin"]>["previewUrl"];
  };
  disabled: boolean;
  /** Startup warnings; the plugin logs them once Payload's logger exists. */
  warnings: string[];
};

/**
 * What a page shows in the tree: `live` is a collection without drafts, `changed` a published page
 * with a newer draft (spec section 7.2).
 */
export type TreeStatus = "changed" | "draft" | "live" | "published";

/** One row of the tree endpoints (`children`, `search`), spec section 10.2. */
export type TreeItem = {
  access: { delete: boolean; publish: boolean; update: boolean };
  allowedTypes?: string[];
  ancestorIds?: string;
  /** Folders: subfolders and pages directly inside, a root page included. */
  childCount?: number;
  collection: string;
  /** Folders only. */
  defaultType?: string | null;
  depth: number;
  /** The path in the requested locale, `""` while a page has no segment there. */
  fullPath: string;
  /** Folders: whether a root page exists, in any state. */
  hasRootPage?: boolean;
  id: number | string;
  isFolderRoot?: boolean;
  kind: "folder" | "page";
  orderKey: string | null;
  parentId: number | string | null;
  /** The segment the item has in the requested locale, own or fallen back to. */
  slug: string | null;
  /** True when the requested locale has no segment of its own. */
  slugIsFallback: boolean;
  /** Pages only. */
  status?: TreeStatus;
  structureRevision: number;
  title: string;
  /** Folders only: the folder whose lock put the allowed types here. */
  typesLockedBy?: number | string | null;
  updatedAt: string;
};
