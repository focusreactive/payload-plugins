import type { ListViewServerProps } from "payload";

import { pluginSlug } from "../../constants.js";
import type { ConfirmMoves } from "../../types.js";
import { TreeViewClient } from "./TreeViewClient.js";
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
  pageSize: number;
  /** Segments the top level cannot take, which a drop there is refused for on screen. */
  reservedRootSegments: string[];
  /** Page collection slug to its Type column label setting. */
  typeLabels: Record<string, TypeLabelSetting>;
};

/**
 * The folders collection's list view (`admin.components.views.list.Component`). It runs on the
 * server only to read what the client cannot: the plugin's settings and the collection's labels.
 */
export const TreeViewServer = ({
  collectionConfig,
  i18n,
  locale,
  payload,
}: ListViewServerProps) => {
  // A host that replaces `custom` through `folders.overrides` still gets a working tree.
  const settings = (collectionConfig.custom as Record<string, TreeViewSettings | undefined>)[
    pluginSlug
  ] ?? {
    confirmMoves: "urlChange",
    enforceAllowedTypesOnMove: true,
    foldersSlug: collectionConfig.slug,
    hasPreviewUrl: false,
    maxDepth: defaultMaxDepth,
    pageSize: defaultPageSize,
    reservedRootSegments: [],
    typeLabels: {},
  };
  const title = resolveLabelValue(
    collectionConfig.labels.plural as unknown as LabelValue,
    i18n.language,
    i18n
  );
  const typeLabels = resolveTypeLabels(
    settings.typeLabels,
    (slug) =>
      payload.collections[slug as keyof typeof payload.collections]?.config.labels
        .singular as unknown as LabelValue,
    i18n.language,
    i18n
  );

  // Only a collection with drafts has a draft to create: the others open their own form.
  const draftCollections = Object.keys(settings.typeLabels).filter(
    (slug) => payload.collections[slug as keyof typeof payload.collections]?.config.versions?.drafts
  );

  return (
    <TreeViewClient
      confirmMoves={settings.confirmMoves ?? "urlChange"}
      draftCollections={draftCollections}
      enforceAllowedTypesOnMove={settings.enforceAllowedTypesOnMove ?? true}
      foldersSlug={settings.foldersSlug ?? collectionConfig.slug}
      hasPreviewUrl={settings.hasPreviewUrl ?? false}
      initialLocale={locale?.code ?? null}
      maxDepth={settings.maxDepth ?? defaultMaxDepth}
      pageSize={settings.pageSize}
      reservedRootSegments={settings.reservedRootSegments ?? []}
      title={title}
      typeLabels={typeLabels}
    />
  );
};
