/**
 * Strings of the tree view. The namespace is `foldersTree`; the admin reads them with
 * `t("foldersTree:<key>")`. Plural forms follow Payload's `_one` / `_other` suffix rule.
 */
export const en = {
  foldersTree: {
    actionCancel: "Cancel",
    actionDelete: "Delete",
    actionDuplicate: "Duplicate",
    actionMove: "Move",
    actionMoveTo: "Move to...",
    actionNotAllowed: "Your role does not allow this for every selected item",
    actionPublish: "Publish",
    actionSettings: "Settings",
    actionUnpublish: "Unpublish",
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
    itemsSelected_one: "{{count}} item selected",
    itemsSelected_other: "{{count}} items selected",
    loadError: "Could not load this folder",
    loading: "Loading content",
    loadingMore: "Loading more",
    loadMore: "Load {{count}} more",
    noPage: "no page",
    noPageHint: "This folder has no root page yet",
    noUrl: "No URL yet",
    outOfDate: "These rows may be out of date.",
    retry: "Try again",
    rootPage: "Root page",
    rootPageHint: "Root page: its URL is the folder's URL",
    selectAllRows: "Select all loaded rows",
    selectRow: "Select {{name}}",
    statusChanged: "Changed",
    statusDraft: "Draft",
    statusLive: "Live",
    statusPublished: "Published",
    toolbarLabel: "Selected items",
    treeLabel: "Content tree",
  },
} as const;

export type FoldersTranslations = {
  foldersTree: { [key in keyof (typeof en)["foldersTree"]]: string };
};
