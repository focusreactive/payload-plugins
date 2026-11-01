import { toast, useModal } from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useDialogSlug } from "../dialogScope.js";
import type { OperationProgress } from "../../core/operations.js";
import type { FolderId, TreeItem } from "../../types.js";
import { fetchUnfinishedOperations, postOperationAbandon, postOperationStep } from "../api.js";
import type {
  DeletePreview,
  DeleteResult,
  DuplicateResult,
  FoldersApiContext,
  PublishPreview,
  PublishResult,
} from "../api.js";
import type { Translate } from "../compat.js";
import type { FolderChoice } from "../Move/FolderPickerTree.js";
import type { TreeStore } from "../store.js";
import { DeleteDialog, deleteDialogSlug } from "./DeleteDialog.js";
import { DuplicateDialog, duplicateDialogSlug } from "./DuplicateDialog.js";
import { OperationBanner } from "./OperationBanner.js";
import { ProgressDialog, progressDialogSlug } from "./ProgressDialog.js";
import { PublishDialog, publishDialogSlug } from "./PublishDialog.js";
import type { PublishRequestView } from "./PublishDialog.js";
import { createOperationRunner } from "./operationRunner.js";
import type { OperationRunner } from "./operationRunner.js";
import { doneKeyOf, mergeResumed, withProgress, withoutOperation } from "./operationLogic.js";
import type { OperationView, PublishAction } from "./operationLogic.js";

export type OperationsFlowOptions = {
  apiContext: FoldersApiContext;
  /** The slug of the folders collection. */
  foldersSlug: string;
  languageCount: number;
  /** The admin locale; `null` when localization is off. */
  locale: string | null;
  /** A delete or a duplicate finished: the toolbar's selection is stale. */
  onSettled: () => void;
  store: TreeStore;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
};

export type OperationsFlow = {
  /** The progress of unfinished operations, for the top of the tree. */
  banner: ReactNode;
  /** The dialogs; render them once, anywhere under the page. */
  dialogs: ReactNode;
  startDelete: (items: readonly TreeItem[]) => void;
  startDuplicate: (items: readonly TreeItem[]) => void;
  startPublish: (items: readonly TreeItem[], action: PublishAction) => void;
};

/**
 * The Delete, Duplicate and Publish dialogs of spec section 7.10 and the stepping of the large
 * ones (section 5.8). An operation the server stores is stepped from here until it is done, with
 * the tree read again after every step; closing its progress dialog leaves a banner, and a page
 * that loads finds the signed-in user's unfinished operations again and goes on with them.
 */
export const useOperationsFlow = ({
  apiContext,
  foldersSlug,
  languageCount,
  locale,
  onSettled,
  store,
  translate,
  typeLabels,
}: OperationsFlowOptions): OperationsFlow => {
  const { closeModal, isModalOpen, openModal } = useModal();
  const progressSlug = useDialogSlug(progressDialogSlug);
  const deleteSlug = useDialogSlug(deleteDialogSlug);
  const duplicateSlug = useDialogSlug(duplicateDialogSlug);
  const publishSlug = useDialogSlug(publishDialogSlug);
  const [operations, setOperations] = useState<OperationView[]>([]);
  const operationsRef = useRef<OperationView[]>([]);
  const [shownId, setShownId] = useState<FolderId | null>(null);
  const [sessions, setSessions] = useState({ delete: 0, duplicate: 0, publish: 0 });
  const [deleteItems, setDeleteItems] = useState<readonly TreeItem[] | null>(null);
  const [duplicateItems, setDuplicateItems] = useState<readonly TreeItem[] | null>(null);
  const [publishRequest, setPublishRequest] = useState<PublishRequestView | null>(null);
  const isActive = useRef(true);
  const afterDone = useRef(new Map<string, () => void>());
  const userId = store.getOptions()?.userId ?? null;

  const update = useCallback((transform: (current: OperationView[]) => OperationView[]) => {
    operationsRef.current = transform(operationsRef.current);
    setOperations(operationsRef.current);
  }, []);

  const apiContextRef = useRef(apiContext);
  apiContextRef.current = apiContext;

  // The runner outlives every render, so what it calls is read through a ref that each render
  // refreshes: it always reaches the latest translate and callbacks.
  const onProgressRef = useRef<((id: FolderId, progress: OperationProgress) => void) | null>(null);
  onProgressRef.current = (id, progress) => {
    const before = operationsRef.current.find((operation) => String(operation.id) === String(id));
    update((current) => withProgress(current, id, progress));
    if (before === undefined) {
      return;
    }
    // Every step that did something changed rows: read the tree again.
    if (progress.done !== before.done || progress.status === "done") {
      void store.refetchVisible();
    }
    if (progress.status === "done") {
      toast.success(
        translate(doneKeyOf(before.kind), {
          count: progress.total,
          total: progress.total,
        })
      );
      afterDone.current.get(String(id))?.();
      afterDone.current.delete(String(id));
      if (before.kind === "delete" || before.kind === "duplicate") {
        onSettled();
      }
    }
  };

  const translateRef = useRef(translate);
  translateRef.current = translate;

  const runnerRef = useRef<OperationRunner | null>(null);
  if (runnerRef.current === null) {
    runnerRef.current = createOperationRunner({
      isActive: () => isActive.current,
      networkErrorMessage: () => translateRef.current("operationNetworkError"),
      onProgress: (id, progress) => onProgressRef.current?.(id, progress),
      step: (id) => postOperationStep(apiContextRef.current, id),
    });
  }
  const runner = runnerRef.current;

  useEffect(() => {
    isActive.current = true;

    return () => {
      isActive.current = false;
    };
  }, []);

  // A reload, or coming back to the tree, finds what is not done and carries on with it.
  useEffect(() => {
    if (userId === null) {
      return undefined;
    }
    let isCancelled = false;
    const resume = async () => {
      try {
        const resumed = await fetchUnfinishedOperations(apiContext, { userId });
        if (isCancelled) {
          return;
        }
        update((current) => mergeResumed(current, resumed));
        for (const operation of resumed) {
          if (operation.status === "running") {
            void runner.run(operation.id, operation);
          }
        }
      } catch {
        // Nothing to resume is not something the editor can act on; the tree works without it.
      }
    };
    void resume();

    return () => {
      isCancelled = true;
    };
  }, [apiContext, runner, update, userId]);

  const track = useCallback(
    (operation: OperationView, { onDone }: { onDone?: () => void } = {}) => {
      update((current) => mergeResumed(current, [operation]));
      if (onDone) {
        afterDone.current.set(String(operation.id), onDone);
      }
      setShownId(operation.id);
      openModal(progressSlug);
      void runner.run(operation.id, operation);
    },
    [openModal, progressSlug, runner, update]
  );

  const retry = useCallback(
    (id: FolderId) => {
      const current = operationsRef.current.find(
        (operation) => String(operation.id) === String(id)
      );
      if (current === undefined) {
        return;
      }
      update((all) =>
        all.map((operation) =>
          String(operation.id) === String(id)
            ? { ...operation, error: undefined, status: "running" }
            : operation
        )
      );
      void runner.run(id, current);
    },
    [runner, update]
  );

  const abandon = useCallback(
    async (id: FolderId) => {
      const stopped = operationsRef.current.find(
        (operation) => String(operation.id) === String(id)
      );
      if (stopped === undefined) {
        return;
      }
      try {
        const progress = await postOperationAbandon(apiContextRef.current, id);
        if (progress.status !== "abandoned") {
          // It finished while the editor was deciding: report it like any other answer.
          onProgressRef.current?.(id, progress);

          return;
        }
        afterDone.current.delete(String(id));
        update((all) => withoutOperation(all, id));
        if (String(shownId) === String(id)) {
          closeModal(progressSlug);
        }
        toast.success(
          translate("operationStopped", { done: progress.done, total: progress.total })
        );
        // What the steps before the stop did is on the server.
        void store.refetchVisible();
        if (stopped.kind === "delete" || stopped.kind === "duplicate") {
          onSettled();
        }
      } catch (error) {
        toast.error(
          error instanceof Error && error.message !== ""
            ? error.message
            : translate("operationStopFailed")
        );
      }
    },
    [closeModal, onSettled, progressSlug, shownId, store, translate, update]
  );

  const show = useCallback(
    (id: FolderId) => {
      setShownId(id);
      openModal(progressSlug);
    },
    [openModal, progressSlug]
  );

  const open = useCallback(
    (kind: keyof typeof sessions, slug: string) => {
      setSessions((current) => ({ ...current, [kind]: current[kind] + 1 }));
      openModal(slug);
    },
    [openModal]
  );

  const startDelete = useCallback(
    (items: readonly TreeItem[]) => {
      setDeleteItems(items);
      open("delete", deleteSlug);
    },
    [deleteSlug, open]
  );
  const startDuplicate = useCallback(
    (items: readonly TreeItem[]) => {
      setDuplicateItems(items);
      open("duplicate", duplicateSlug);
    },
    [duplicateSlug, open]
  );
  const startPublish = useCallback(
    (items: readonly TreeItem[], action: PublishAction) => {
      setPublishRequest({ action, items });
      open("publish", publishSlug);
    },
    [open, publishSlug]
  );

  const finishDelete = useCallback(
    (result: DeleteResult, _preview: DeletePreview) => {
      closeModal(deleteSlug);
      if ("operationId" in result) {
        track({
          done: 0,
          id: result.operationId,
          kind: "delete",
          status: "running",
          total: result.total,
        });

        return;
      }
      const count = result.trashed > 0 ? result.trashed : result.deleted;
      toast.success(translate(result.trashed > 0 ? "deleteDoneTrash" : "deleteDone", { count }));
      void store.refetchVisible();
      onSettled();
    },
    [closeModal, deleteSlug, onSettled, store, track, translate]
  );

  const finishDuplicate = useCallback(
    (result: DuplicateResult, target: FolderChoice) => {
      closeModal(duplicateSlug);
      const showCopies = () => {
        if (target.id !== null) {
          void store.setExpanded(target.id, true);
        }
        void store.refetchVisible();
      };
      if ("operationId" in result) {
        track(
          {
            done: 0,
            id: result.operationId,
            kind: "duplicate",
            status: "running",
            total: result.total,
          },
          { onDone: showCopies }
        );

        return;
      }
      toast.success(translate("duplicateDone", { count: result.copied }));
      showCopies();
      onSettled();
    },
    [closeModal, duplicateSlug, onSettled, store, track, translate]
  );

  const finishPublish = useCallback(
    (result: PublishResult, action: PublishAction, _preview: PublishPreview) => {
      closeModal(publishSlug);
      if ("operationId" in result) {
        track({
          done: 0,
          id: result.operationId,
          kind: action,
          status: "running",
          total: result.total,
        });

        return;
      }
      toast.success(translate(doneKeyOf(action), { count: result.updated, total: result.updated }));
      void store.refetchVisible();
    },
    [closeModal, publishSlug, store, track, translate]
  );

  const shown = operations.find((operation) => String(operation.id) === String(shownId)) ?? null;
  const isProgressOpen = isModalOpen(progressSlug);
  const bannerOperations = operations.filter(
    (operation) =>
      operation.status !== "done" &&
      operation.status !== "abandoned" &&
      !(isProgressOpen && String(operation.id) === String(shownId))
  );

  return {
    banner: (
      <OperationBanner
        onAbandon={abandon}
        onRetry={retry}
        onShow={show}
        operations={bannerOperations}
        translate={translate}
      />
    ),
    dialogs: (
      <>
        <DeleteDialog
          context={apiContext}
          items={deleteItems}
          onDeleted={finishDelete}
          session={sessions.delete}
          translate={translate}
        />
        <DuplicateDialog
          context={apiContext}
          foldersSlug={foldersSlug}
          items={duplicateItems}
          locale={locale}
          onDuplicated={finishDuplicate}
          session={sessions.duplicate}
          store={store}
          translate={translate}
          typeLabels={typeLabels}
        />
        <PublishDialog
          context={apiContext}
          languageCount={languageCount}
          locale={locale}
          onPublished={finishPublish}
          request={publishRequest}
          session={sessions.publish}
          translate={translate}
          typeLabels={typeLabels}
        />
        <ProgressDialog
          onAbandon={abandon}
          onRetry={retry}
          operation={shown}
          translate={translate}
        />
      </>
    ),
    startDelete,
    startDuplicate,
    startPublish,
  };
};
