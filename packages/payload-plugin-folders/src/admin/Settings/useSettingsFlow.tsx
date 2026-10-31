import { toast, useModal } from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { ConfirmMoves, TreeItem } from "../../types.js";
import { fetchLatestStatus, isDraftPendingError, writeDocument } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import { rootUpdateModeOf } from "../ContextMenu/rootPage.js";
import type { DropMove } from "../Move/useMoveFlow.js";
import type { TreeStore, TreeStoreState } from "../store.js";
import { FolderSettingsDrawer, folderSettingsDrawerSlug } from "./FolderSettingsDrawer.js";
import type { FolderSettingsRequest } from "./FolderSettingsDrawer.js";
import { folderPathOfPage } from "./folderPath.js";
import { pageBodyOf } from "./pageSettings.js";
import { PageSettingsDrawer, pageSettingsDrawerSlug } from "./PageSettingsDrawer.js";
import type { PageFieldNames, PageSettingsRequest } from "./PageSettingsDrawer.js";
import { UnrootDialog, unrootDialogSlug } from "./UnrootDialog.js";
import type { UnrootRequest } from "./UnrootDialog.js";
import { useConfirmations } from "./useConfirmations.js";

export type SettingsFlow = {
  /** The drawers and dialogs; render them once, anywhere under the page. */
  dialogs: ReactNode;
  /** Opens Settings for a folder or a page. */
  startSettings: (item: TreeItem) => void;
  /** "Unset root page": asks for the page's own segment, then saves it. */
  startUnroot: (item: TreeItem) => void;
};

export type SettingsFlowOptions = {
  adminRoute: string;
  apiContext: FoldersApiContext;
  confirmMoves: ConfirmMoves;
  draftCollections: readonly string[];
  enforceAllowedTypes: boolean;
  foldersSlug: string;
  language: string;
  languageCount: number;
  locale: string | null;
  onMove: (move: DropMove) => Promise<void>;
  pageFields: Readonly<Record<string, PageFieldNames>>;
  state: TreeStoreState;
  store: TreeStore;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
};

/**
 * Settings and Unset root page (spec sections 4 and 7.8): which drawer opens for a row, and the
 * un-root dialog that the context menu and the page drawer share. The un-root dialog answers as a
 * promise, so the page drawer can wait for the segment in the middle of its save.
 */
export const useSettingsFlow = ({
  adminRoute,
  apiContext,
  confirmMoves,
  draftCollections,
  enforceAllowedTypes,
  foldersSlug,
  language,
  languageCount,
  locale,
  onMove,
  pageFields,
  state,
  store,
  translate,
  typeLabels,
}: SettingsFlowOptions): SettingsFlow => {
  const { modalState, openModal } = useModal();
  const confirmations = useConfirmations({ languageCount, translate });
  const [folderRequest, setFolderRequest] = useState<FolderSettingsRequest | null>(null);
  const [pageRequest, setPageRequest] = useState<PageSettingsRequest | null>(null);
  const [unrootRequest, setUnrootRequest] = useState<UnrootRequest | null>(null);
  const sessions = useRef(0);
  const unrootAnswer = useRef<((segment: string | null) => void) | null>(null);

  const startSettings = useCallback(
    (item: TreeItem) => {
      sessions.current += 1;
      if (item.kind === "folder") {
        setFolderRequest({ item, session: sessions.current });
        openModal(folderSettingsDrawerSlug);
      } else {
        setPageRequest({ item, session: sessions.current });
        openModal(pageSettingsDrawerSlug);
      }
    },
    [openModal]
  );

  const askUnroot = useCallback(
    (request: Omit<UnrootRequest, "session">) =>
      new Promise<string | null>((resolve) => {
        sessions.current += 1;
        unrootAnswer.current = resolve;
        setUnrootRequest({ ...request, session: sessions.current });
        openModal(unrootDialogSlug);
      }),
    [openModal]
  );

  // The dialog closed without a choice: Cancel, the close button or Escape.
  const wasUnrootOpen = useRef(false);
  const isUnrootOpen = Boolean(modalState[unrootDialogSlug]?.isOpen);
  useEffect(() => {
    if (wasUnrootOpen.current && !isUnrootOpen) {
      unrootAnswer.current?.(null);
      unrootAnswer.current = null;
    }
    wasUnrootOpen.current = isUnrootOpen;
  }, [isUnrootOpen]);

  const hasDraftsFor = useCallback(
    (item: TreeItem) => draftCollections.includes(item.collection),
    [draftCollections]
  );

  const saveUnroot = useCallback(
    async (item: TreeItem, segment: string, forceDraft: boolean) => {
      const names = pageFields[item.collection] ?? { segmentField: "slug", titleField: "title" };
      const hasDrafts = draftCollections.includes(item.collection);
      try {
        // The row's status was read when the tree loaded: read the page again before a live save,
        // so a draft saved since is kept a draft (the same care as Set as root page).
        let mode: "draft" | "live" =
          forceDraft || (hasDrafts && rootUpdateModeOf(item) === "draft") ? "draft" : "live";
        if (hasDrafts && mode === "live") {
          mode = (await fetchLatestStatus(apiContext, item))._status === "draft" ? "draft" : "live";
        }
        await writeDocument(apiContext, {
          body: pageBodyOf({
            ...names,
            changes: { isFolderRoot: false, segment },
            hasDrafts,
            mode,
          }),
          collection: item.collection,
          id: item.id,
          query: mode === "draft" ? { draft: "true", locale } : { locale },
        });
        await store.invalidate([item.parentId]);
        toast.success(
          translate(mode === "draft" ? "unrootDoneDraft" : "unrootDone", { title: item.title })
        );
      } catch (error) {
        if (hasDrafts && isDraftPendingError(error)) {
          toast.error(error instanceof Error ? error.message : "", {
            action: {
              label: translate("saveAsDraftInstead"),
              onClick: () => void saveUnroot(item, segment, true),
            },
          });

          return;
        }
        toast.error(
          error instanceof Error && error.message !== "" ? error.message : translate("unrootFailed")
        );
      }
    },
    [apiContext, draftCollections, locale, pageFields, store, translate]
  );

  const startUnroot = useCallback(
    async (item: TreeItem) => {
      const segment = await askUnroot({
        collection: item.collection,
        folderId: item.parentId,
        folderPath: folderPathOfPage(item, state),
        id: item.id,
        locale,
        storedSlug: item.slug,
        title: item.title,
        willGoLive: !hasDraftsFor(item) || rootUpdateModeOf(item) === "live",
      });
      if (segment !== null) {
        await saveUnroot(item, segment, false);
      }
    },
    [askUnroot, hasDraftsFor, locale, saveUnroot, state]
  );

  // The questions a settings save asks go inside the open drawer, which would otherwise cover them;
  // with no drawer open (Unset root page from the menu) they sit beside the tree.
  const isFolderDrawerOpen = Boolean(modalState[folderSettingsDrawerSlug]?.isOpen);
  const isPageDrawerOpen = Boolean(modalState[pageSettingsDrawerSlug]?.isOpen);
  const questions = (
    <>
      <UnrootDialog
        apiContext={apiContext}
        onConfirm={(segment) => {
          unrootAnswer.current?.(segment);
          unrootAnswer.current = null;
        }}
        request={unrootRequest}
        translate={translate}
      />
      {confirmations.dialogs}
    </>
  );
  const isHostedInDrawer = isFolderDrawerOpen || isPageDrawerOpen;

  const dialogs = (
    <>
      <FolderSettingsDrawer
        apiContext={apiContext}
        confirmations={confirmations}
        confirmMoves={confirmMoves}
        dialogs={isFolderDrawerOpen ? questions : null}
        enforceAllowedTypes={enforceAllowedTypes}
        foldersSlug={foldersSlug}
        language={language}
        locale={locale}
        onMove={onMove}
        request={folderRequest}
        store={store}
        translate={translate}
        typeLabels={typeLabels}
      />
      <PageSettingsDrawer
        adminRoute={adminRoute}
        apiContext={apiContext}
        askUnroot={askUnroot}
        confirmations={confirmations}
        confirmMoves={confirmMoves}
        dialogs={isPageDrawerOpen && !isFolderDrawerOpen ? questions : null}
        draftCollections={draftCollections}
        enforceAllowedTypes={enforceAllowedTypes}
        foldersSlug={foldersSlug}
        locale={locale}
        onMove={onMove}
        pageFields={pageFields}
        request={pageRequest}
        store={store}
        translate={translate}
        typeLabels={typeLabels}
      />
      {isHostedInDrawer ? null : questions}
    </>
  );

  return {
    dialogs,
    startSettings,
    startUnroot: (item: TreeItem) => void startUnroot(item),
  };
};
