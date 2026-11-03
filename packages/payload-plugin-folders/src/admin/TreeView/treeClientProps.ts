import type { ResolvedTreeSettings } from "./readTreeSettings.js";
import type { TreeViewClientProps } from "./TreeViewClient.js";

/** What the tree view and the sidebar tab both hand their client component, from the settings. */
export const treeClientPropsOf = ({
  initialLocale,
  settings,
  title,
}: {
  initialLocale: string | null;
  settings: ResolvedTreeSettings;
  title: string;
}): TreeViewClientProps => ({
  confirmMoves: settings.confirmMoves,
  draftCollections: settings.draftCollections,
  enforceAllowedTypesOnMove: settings.enforceAllowedTypesOnMove,
  foldersSlug: settings.foldersSlug,
  hasPreviewUrl: settings.hasPreviewUrl,
  initialLocale,
  maxDepth: settings.maxDepth,
  pageFields: settings.pageFields,
  pageSize: settings.pageSize,
  reservedRootSegments: settings.reservedRootSegments,
  title,
  typeLabels: settings.typeLabels,
});
