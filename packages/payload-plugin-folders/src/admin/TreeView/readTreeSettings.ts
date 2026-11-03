import type { Payload } from "payload";

import { pluginSlug } from "../../constants.js";
import type { ConfirmMoves } from "../../types.js";
import { resolveLabelValue, resolveTypeLabels } from "./typeLabels.js";
import type { LabelValue, TypeLabelSetting } from "./typeLabels.js";

const defaultPageSize = 100;
const defaultMaxDepth = 20;

/** What `plugin.ts` stores on the folders collection for the admin, all plain values. */
export type TreeViewSettings = {
  /** When the admin asks before a move (`admin.confirmMoves`). */
  confirmMoves: ConfirmMoves;
  /** Whether a folder's allowed types refuse a move; off turns the refusal into a warning. */
  enforceAllowedTypesOnMove: boolean;
  /** The slug of the folders collection, which the admin needs to tell folders from pages. */
  foldersSlug: string;
  /** Whether the host set `admin.previewUrl`, which shows "View page" in the context menu. */
  hasPreviewUrl: boolean;
  /** The deepest a URL may go; a drop that would pass it is refused on screen. */
  maxDepth: number;
  /** Page collection slug to the names of its title and segment fields, for the settings drawers. */
  pageFields: Record<string, { segmentField: string; titleField: string }>;
  pageSize: number;
  /** Segments the top level cannot take, which a drop there is refused for on screen. */
  reservedRootSegments: string[];
  /** Page collection slug to its Type column label setting. */
  typeLabels: Record<string, TypeLabelSetting>;
};

/** What the admin's client components take: the settings with the labels resolved for one user. */
export type ResolvedTreeSettings = Omit<TreeViewSettings, "typeLabels"> & {
  /** Page collections with drafts: a page of one is created as a draft. */
  draftCollections: string[];
  typeLabels: Record<string, string>;
};

/**
 * The plugin's settings as the admin's server components read them: from the folders collection's
 * `custom`, with the page type labels resolved in the signed-in user's language. A host that
 * replaces `custom` through `folders.overrides` still gets a working tree.
 */
export const readTreeSettings = ({
  foldersSlug,
  i18n,
  payload,
}: {
  foldersSlug: string;
  i18n: { language: string; t?: unknown };
  payload: Payload;
}): ResolvedTreeSettings => {
  const foldersConfig =
    payload.collections[foldersSlug as keyof typeof payload.collections]?.config;
  const stored = (
    foldersConfig?.custom as Record<string, TreeViewSettings | undefined> | undefined
  )?.[pluginSlug];
  const settings: TreeViewSettings = stored ?? {
    confirmMoves: "urlChange",
    enforceAllowedTypesOnMove: true,
    foldersSlug,
    hasPreviewUrl: false,
    maxDepth: defaultMaxDepth,
    pageFields: {},
    pageSize: defaultPageSize,
    reservedRootSegments: [],
    typeLabels: {},
  };

  const typeLabels = resolveTypeLabels(
    settings.typeLabels,
    (slug) =>
      payload.collections[slug as keyof typeof payload.collections]?.config.labels
        .singular as unknown as LabelValue,
    i18n.language,
    i18n
  );

  return {
    confirmMoves: settings.confirmMoves ?? "urlChange",
    // Only a collection with drafts has a draft to create: the others open their own form.
    draftCollections: Object.keys(settings.typeLabels).filter(
      (slug) =>
        payload.collections[slug as keyof typeof payload.collections]?.config.versions?.drafts
    ),
    enforceAllowedTypesOnMove: settings.enforceAllowedTypesOnMove ?? true,
    foldersSlug: settings.foldersSlug ?? foldersSlug,
    hasPreviewUrl: settings.hasPreviewUrl ?? false,
    maxDepth: settings.maxDepth ?? defaultMaxDepth,
    pageFields: settings.pageFields ?? {},
    pageSize: settings.pageSize ?? defaultPageSize,
    reservedRootSegments: settings.reservedRootSegments ?? [],
    typeLabels,
  };
};

/** The label of a collection group for a title, kept here so every server component resolves it alike. */
export const resolveCollectionTitle = (
  label: unknown,
  i18n: { language: string; t?: unknown }
): string => resolveLabelValue(label as LabelValue, i18n.language, i18n);
