import { toast, useModal } from "@payloadcms/ui";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { FolderId, TreeItem } from "../../types.js";
import type { FoldersApiContext } from "../api.js";
import { editViewUrl } from "../compat.js";
import type { Translate } from "../compat.js";
import { findLoadedFolder } from "../store.js";
import type { TreeStore, TreeStoreState } from "../store.js";
import { CreateFolderDialog, createFolderDialogSlug } from "./CreateFolderDialog.js";
import { CreatePageDialog, createPageDialogSlug } from "./CreatePageDialog.js";
import type { NewPageValues } from "./CreatePageDialog.js";
import { PageDrawer } from "./PageDrawer.js";

export type CreateFlow = {
  /** The dialogs and the drawer; render them once, anywhere under the page. */
  dialogs: ReactNode;
  /** Opens New folder; `null` is the top level. */
  startFolder: (parent: TreeItem | null) => void;
  /** Opens New page with this page type chosen; `null` is the top level. */
  startPage: (folder: TreeItem | null, collection: string) => void;
};

type FolderRequest = { parent: TreeItem | null; session: number };
type PageRequest = { collection: string; folder: TreeItem | null; session: number };
type DrawerRequest = {
  collection: string;
  parentId: FolderId | null;
  session: number;
  values: NewPageValues;
};

/**
 * Puts the keyboard focus on a tree row once it is on screen. The row of a folder that was just
 * created arrives with the read that follows the create, and a closing dialog gives focus back to
 * what opened it, so this waits for both.
 */
export const focusTreeRowWhenShown = (collection: string, id: FolderId): void => {
  const selector = `[data-testid="tree-row"][data-collection="${collection}"][data-item-id="${id}"]`;
  let attempts = 0;
  const focusIt = () => {
    const row = document.querySelector<HTMLElement>(selector);
    if (row) {
      row.focus();
      // The closing dialog may still hand focus back to its opener once.
      setTimeout(() => row.focus(), 250);

      return;
    }
    attempts += 1;
    if (attempts < 40) {
      setTimeout(focusIt, 50);
    }
  };
  setTimeout(focusIt, 100);
};

const parentChainOf = (state: TreeStoreState, parentId: FolderId | null): (FolderId | null)[] => [
  parentId,
  findLoadedFolder(state, parentId)?.parentId ?? null,
];

/**
 * Create in place (spec section 7.7): New folder and New page, and the collection's own form in a
 * drawer for a page that cannot be made as a draft. A new folder is read in, opened under its
 * parent and focused; a new page opens in the edit view.
 */
export const useCreateFlow = ({
  apiContext,
  adminRoute,
  draftCollections,
  foldersSlug,
  onOpenPage,
  state,
  store,
  translate,
  typeLabels,
}: {
  adminRoute: string;
  apiContext: FoldersApiContext;
  draftCollections: readonly string[];
  foldersSlug: string;
  onOpenPage: (url: string) => void;
  state: TreeStoreState;
  store: TreeStore;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
}): CreateFlow => {
  const { openModal } = useModal();
  const [folderRequest, setFolderRequest] = useState<FolderRequest | null>(null);
  const [pageRequest, setPageRequest] = useState<PageRequest | null>(null);
  const [drawerRequest, setDrawerRequest] = useState<DrawerRequest | null>(null);
  const sessions = useRef(0);

  const startFolder = useCallback(
    (parent: TreeItem | null) => {
      sessions.current += 1;
      setFolderRequest({ parent, session: sessions.current });
      openModal(createFolderDialogSlug);
    },
    [openModal]
  );
  const startPage = useCallback(
    (folder: TreeItem | null, collection: string) => {
      sessions.current += 1;
      setPageRequest({ collection, folder, session: sessions.current });
      openModal(createPageDialogSlug);
    },
    [openModal]
  );

  const refreshAround = useCallback(
    (parentId: FolderId | null) => store.invalidate(parentChainOf(state, parentId)),
    [state, store]
  );

  const handleFolderCreated = useCallback(
    async ({ id, name, parentId }: { id: FolderId; name: string; parentId: FolderId | null }) => {
      await refreshAround(parentId);
      // The new folder sits on top of its parent, so the parent opens to show it.
      if (parentId !== null) {
        await store.setExpanded(parentId, true);
      }
      toast.success(translate("createFolderDone", { name }));
      focusTreeRowWhenShown(foldersSlug, id);
    },
    [foldersSlug, refreshAround, store, translate]
  );

  const handlePageCreated = useCallback(
    ({
      collection,
      id,
      parentId,
    }: {
      collection: string;
      id: FolderId;
      parentId: FolderId | null;
    }) => {
      void refreshAround(parentId);
      onOpenPage(editViewUrl(adminRoute, collection, id));
    },
    [adminRoute, onOpenPage, refreshAround]
  );

  const clearDrawer = useCallback(() => setDrawerRequest(null), []);

  const handleNeedsDrawer = useCallback(
    ({ collection, values }: { collection: string; values: NewPageValues }) => {
      sessions.current += 1;
      setDrawerRequest({ collection, parentId: values.folder, session: sessions.current, values });
    },
    []
  );

  const dialogs = (
    <>
      <CreateFolderDialog
        apiContext={apiContext}
        foldersSlug={foldersSlug}
        onCreated={handleFolderCreated}
        parent={folderRequest?.parent}
        session={folderRequest?.session ?? 0}
        store={store}
        translate={translate}
        typeLabels={typeLabels}
      />
      <CreatePageDialog
        apiContext={apiContext}
        draftCollections={draftCollections}
        folder={pageRequest?.folder}
        initialCollection={pageRequest?.collection ?? ""}
        onCreated={handlePageCreated}
        onNeedsDrawer={handleNeedsDrawer}
        session={pageRequest?.session ?? 0}
        store={store}
        translate={translate}
        typeLabels={typeLabels}
      />
      {drawerRequest === null ? null : (
        <PageDrawer
          collection={drawerRequest.collection}
          key={drawerRequest.session}
          onClose={clearDrawer}
          onSaved={() => void refreshAround(drawerRequest.parentId)}
          values={drawerRequest.values}
        />
      )}
    </>
  );

  return { dialogs, startFolder, startPage };
};
