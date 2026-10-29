import type { ListViewServerProps } from "payload";

import { pluginSlug } from "../../constants.js";
import { TreeViewClient } from "./TreeViewClient.js";

const defaultPageSize = 100;

/** What `plugin.ts` stores on the folders collection for the admin, all plain values. */
export type TreeViewSettings = {
  pageSize: number;
  /** Page collection slug to the label of the Type column. */
  typeLabels: Record<string, string>;
};

type LabelValue = string | Record<string, string> | ((args: never) => string) | undefined;

/** A collection label as the admin language shows it. */
const resolveLabel = (label: LabelValue, language: string): string => {
  if (typeof label === "string") {
    return label;
  }
  if (label && typeof label === "object") {
    return label[language] ?? label.en ?? Object.values(label)[0] ?? "";
  }

  return "";
};

/**
 * The folders collection's list view (`admin.components.views.list.Component`). It runs on the
 * server only to read what the client cannot: the plugin's settings and the collection's labels.
 */
export const TreeViewServer = ({ collectionConfig, i18n, locale }: ListViewServerProps) => {
  // A host that replaces `custom` through `folders.overrides` still gets a working tree.
  const settings = (collectionConfig.custom as Record<string, TreeViewSettings | undefined>)[
    pluginSlug
  ] ?? { pageSize: defaultPageSize, typeLabels: {} };
  const title = resolveLabel(
    collectionConfig.labels.plural as unknown as LabelValue,
    i18n.language
  );

  return (
    <TreeViewClient
      initialLocale={locale?.code ?? null}
      pageSize={settings.pageSize}
      title={title}
      typeLabels={settings.typeLabels}
    />
  );
};
