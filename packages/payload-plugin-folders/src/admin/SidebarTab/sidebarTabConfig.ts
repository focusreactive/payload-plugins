import type { Config, SidebarTab } from "payload";

import { pluginSlug, sidebarTabSlug } from "../../constants.js";
import type { ResolvedOptions } from "../../types.js";

/** The label an editor sees when the host did not name the tab: translated, not a fixed word. */
const defaultTabLabel: SidebarTab["label"] = ({ t }) =>
  (t as unknown as (key: string) => string)("foldersTree:sidebarTab");

/**
 * The plugin's tab for `admin.components.sidebar.tabs` (Payload 4's sidebar tab system), `null`
 * when the host turned it off with `admin.sidebarTab: false`. The default label is "Tree" in the
 * admin's language; a label the host set is shown as it is.
 */
export const buildSidebarTab = (options: ResolvedOptions): SidebarTab | null => {
  if (options.admin.sidebarTab === false) {
    return null;
  }
  const { label } = options.admin.sidebarTab;

  return {
    slug: sidebarTabSlug,
    components: {
      Content: {
        path: `${pluginSlug}/rsc#SidebarTabServer`,
        serverProps: { foldersSlug: options.folders.slug },
      },
      Icon: { clientProps: { color: "muted" }, path: "@payloadcms/ui#FolderIcon" },
    },
    // "Tree" is the default, so the default is the translated word.
    label: label === "Tree" ? defaultTabLabel : label,
  };
};

/**
 * The host's admin config with the plugin's tab added after the host's own tabs; unchanged when
 * the tab is off or the host already has a tab with that slug.
 */
export const withSidebarTab = (
  admin: Config["admin"],
  options: ResolvedOptions
): Config["admin"] => {
  const tab = buildSidebarTab(options);
  const hostTabs = admin?.components?.sidebar?.tabs ?? [];
  if (tab === null || hostTabs.some((hostTab) => hostTab.slug === tab.slug)) {
    return admin;
  }

  return {
    ...admin,
    components: {
      ...admin?.components,
      sidebar: { ...admin?.components?.sidebar, tabs: [...hostTabs, tab] },
    },
  };
};
