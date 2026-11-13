import type { ListViewServerProps, Locale, Payload } from "payload";

import { readTreeSettings, resolveCollectionTitle } from "../TreeView/readTreeSettings.js";
import { treeClientPropsOf } from "../TreeView/treeClientProps.js";
import { SidebarTabClient } from "./SidebarTabClient.js";

/**
 * The content of the plugin's sidebar tab (`admin.components.sidebar.tabs`). It runs on the server
 * only to read what the client cannot, as the tree view's server component does. Payload renders a
 * tab's content once per tab and keeps it, with the route params of its own server function and
 * not of the page, so nothing here may depend on the page being shown: the client reads the open
 * document from the address.
 */
export const SidebarTabServer = ({
  foldersSlug,
  i18n,
  locale,
  payload,
}: {
  /** From the tab's component config. */
  foldersSlug: string;
  i18n: ListViewServerProps["i18n"];
  locale?: Locale;
  payload: Payload;
}) => {
  const settings = readTreeSettings({ foldersSlug, i18n, payload });
  const folders = payload.collections[foldersSlug as keyof typeof payload.collections]?.config;
  const title = resolveCollectionTitle(folders?.labels.plural, i18n);

  return (
    <SidebarTabClient
      {...treeClientPropsOf({ initialLocale: locale?.code ?? null, settings, title })}
    />
  );
};
