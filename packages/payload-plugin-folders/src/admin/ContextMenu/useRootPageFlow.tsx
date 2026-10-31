import { toast, useModal } from "@payloadcms/ui";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { TreeItem } from "../../types.js";
import { fetchLatestStatus, isDraftPendingError, writeDocument } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import { ConfirmUrlChangeDialog } from "../Move/ConfirmUrlChangeDialog.js";
import type { ConfirmRequest } from "../Move/ConfirmUrlChangeDialog.js";
import { findLoadedFolder } from "../store.js";
import type { TreeStore, TreeStoreState } from "../store.js";
import { rootChangePreviewOf, rootPageBodyOf, rootUpdateModeOf } from "./rootPage.js";

export const rootDialogSlug = "fr-folders-confirm-root";

export type RootPageFlow = {
  dialog: ReactNode;
  /** Makes the page the root page of its folder, asking first when that changes a live URL. */
  start: (item: TreeItem) => void;
};

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : "");

/**
 * "Set as root page" (spec section 4): one update of the page through Payload's REST route, so the
 * server's own rules decide. It refuses a second root page, writes the redirect rows when a live
 * URL changes (`settlePageRedirects`) and keeps a draft out of the live site. A save that changes
 * the live URL asks first, with the confirmation the moves use.
 */
export const useRootPageFlow = ({
  apiContext,
  languageCount,
  state,
  store,
  translate,
}: {
  apiContext: FoldersApiContext;
  languageCount: number;
  state: TreeStoreState;
  store: TreeStore;
  translate: Translate;
}): RootPageFlow => {
  const { openModal } = useModal();
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pending = useRef<TreeItem | null>(null);
  const openings = useRef(0);

  const save = useCallback(
    async (item: TreeItem, folderPath: string, forceDraft = false) => {
      setIsSaving(true);
      try {
        let mode = forceDraft ? "draft" : rootUpdateModeOf(item);
        if (mode === "live") {
          // The row's status was read when the tree loaded. A draft saved since (elsewhere, or by an
          // autosave) leaves it stale, and a live save would publish that draft with the flag: read
          // the page again right before writing, and keep a pending draft a draft.
          const latest = await fetchLatestStatus(apiContext, item);
          if (latest._status === "draft") {
            mode = "draft";
          }
        }
        await writeDocument(apiContext, {
          body: rootPageBodyOf(item, mode),
          collection: item.collection,
          id: item.id,
          query: mode === "draft" ? { draft: "true" } : {},
        });
        const folder = findLoadedFolder(state, item.parentId);
        // The folder's "no page" chip and the page's house icon come from the folder's own row.
        await store.invalidate([item.parentId, folder?.parentId ?? null]);
        toast.success(
          translate(mode === "draft" ? "rootSetDraft" : "rootSetDone", {
            path: folderPath,
            title: item.title,
          })
        );
      } catch (error) {
        const detail = messageOf(error);
        // A draft saved after the status read above got past it: the server refused the live save
        // under the tree lock (spec section 4), and the draft stays a draft if the editor says so.
        toast.error(detail === "" ? translate("rootSetFailed") : detail, {
          action: isDraftPendingError(error)
            ? {
                label: translate("saveAsDraftInstead"),
                onClick: () => void save(item, folderPath, true),
              }
            : undefined,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [apiContext, state, store, translate]
  );

  const start = useCallback(
    (item: TreeItem) => {
      const folder = findLoadedFolder(state, item.parentId);
      const folderPath = folder?.fullPath ?? "/";
      if (rootUpdateModeOf(item) === "draft") {
        void save(item, folderPath);

        return;
      }
      pending.current = item;
      openings.current += 1;
      setRequest({
        confirmingLabel: translate("rootConfirming"),
        confirmLabel: translate("menuSetAsRoot"),
        id: openings.current,
        items: [item],
        preview: rootChangePreviewOf(item, folderPath, folder?.id ?? null),
        targetTitle: folderPath,
        title: translate("rootConfirmTitle", { path: folderPath, title: item.title }),
      });
      openModal(rootDialogSlug);
    },
    [openModal, save, state, translate]
  );

  const dialog = (
    <ConfirmUrlChangeDialog
      busy={isSaving}
      languageCount={languageCount}
      onConfirm={async () => {
        const item = pending.current;
        if (item) {
          await save(item, request?.targetTitle ?? "/");
        }
      }}
      onReload={() => void store.refetchVisible()}
      request={request}
      slug={rootDialogSlug}
      translate={translate}
    />
  );

  return { dialog, start };
};
