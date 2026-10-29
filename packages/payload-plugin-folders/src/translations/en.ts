/**
 * Strings of the tree view. The namespace is `foldersTree`; the admin reads them with
 * `t("foldersTree:<key>")`. Plural forms follow Payload's `_one` / `_other` suffix rule.
 */
export const en = {
  foldersTree: {
    childCount_one: "{{count}} item",
    childCount_other: "{{count}} items",
    collapse: "Collapse {{name}}",
    columnName: "Name",
    columnStatus: "Status",
    columnType: "Type",
    columnUpdated: "Updated",
    expand: "Expand {{name}}",
    fallback: "fallback",
    fallbackHint:
      "This language has no URL segment of its own, so the default language's segment is shown",
    folder: "Folder",
    folderOnlyTypes: "Folder, only {{types}}",
    loadError: "Could not load this folder",
    loading: "Loading content",
    loadingMore: "Loading more",
    loadMore: "Load {{count}} more",
    noPage: "no page",
    noPageHint: "This folder has no root page yet",
    noUrl: "No URL yet",
    retry: "Try again",
    rootPage: "Root page",
    rootPageHint: "Root page: its URL is the folder's URL",
    statusChanged: "Changed",
    statusDraft: "Draft",
    statusLive: "Live",
    statusPublished: "Published",
    treeLabel: "Content tree",
  },
} as const;

export type FoldersTranslations = {
  foldersTree: { [key in keyof (typeof en)["foldersTree"]]: string };
};
