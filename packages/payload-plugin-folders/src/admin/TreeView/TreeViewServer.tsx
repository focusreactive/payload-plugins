import type { ListViewServerProps } from "payload";

import { pluginSlug } from "../../constants.js";
import { TreeViewClient } from "./TreeViewClient.js";
import { resolveLabelValue, resolveTypeLabels } from "./typeLabels.js";
import type { LabelValue, TypeLabelSetting } from "./typeLabels.js";

const defaultPageSize = 100;

/** What `plugin.ts` stores on the folders collection for the admin, all plain values. */
export type TreeViewSettings = {
  pageSize: number;
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
  ] ?? { pageSize: defaultPageSize, typeLabels: {} };
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

  return (
    <TreeViewClient
      initialLocale={locale?.code ?? null}
      pageSize={settings.pageSize}
      title={title}
      typeLabels={typeLabels}
    />
  );
};
