import type { ListViewServerProps } from "payload";

import { TreeViewClient } from "./TreeViewClient.js";
import { readTreeSettings, resolveCollectionTitle } from "./readTreeSettings.js";
import { treeClientPropsOf } from "./treeClientProps.js";

export type { TreeViewSettings } from "./readTreeSettings.js";

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
  const settings = readTreeSettings({ foldersSlug: collectionConfig.slug, i18n, payload });
  const title = resolveCollectionTitle(collectionConfig.labels.plural, i18n);

  return (
    <TreeViewClient
      {...treeClientPropsOf({ initialLocale: locale?.code ?? null, settings, title })}
    />
  );
};
