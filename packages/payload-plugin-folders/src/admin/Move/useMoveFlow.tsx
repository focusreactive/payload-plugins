import { toast, useModal } from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { ConfirmMoves, TreeItem } from "../../types.js";
import { FoldersApiError, previewMove } from "../api.js";
import type { MovePreview } from "../api.js";
import type { Translate } from "../compat.js";
import type { TreeStore } from "../store.js";
import { useApiContext } from "../useApiContext.js";
import { useDialogSlug } from "../dialogScope.js";
import { confirmDialogSlug, ConfirmUrlChangeDialog } from "./ConfirmUrlChangeDialog.js";
import type { ConfirmRequest } from "./ConfirmUrlChangeDialog.js";
import { MoveDialog, moveDialogSlug } from "./MoveDialog.js";
import type { MoveChoice } from "./MoveDialog.js";
import {
  buildMoveBody,
  needsConfirmation,
  rootsOfSelection,
  runMove,
  undoMove,
} from "./moveFlow.js";
import type { MoveOutcome, MoveTarget } from "./moveFlow.js";

/** The class the toast action button wears, so the stylesheet can align it with the title. */
export const toastActionClass = "fr-folders-toast-action";

/** For a long message with an action: the action sits under the text instead of squeezing it. */
export const toastStackedClass = "fr-folders-toast--stacked";

/** How long the Undo toast stays (spec section 5.7). */
export const undoToastDurationMs = 10_000;

export type MoveFlowOptions = {
  confirmMoves: ConfirmMoves;
  enforceAllowedTypesOnMove: boolean;
  /** The slug of the folders collection, from the plugin's settings. */
  foldersSlug: string;
  languageCount: number;
  /** A move went through: the toolbar's selection is stale. */
  onMoved: () => void;
  /** A move was refused or failed and the rows are back: these rows are still the selection. */
  onMoveFailed: (items: readonly TreeItem[]) => void;
  store: TreeStore;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
};

export type MoveFlow = {
  /** The dialogs; render them once, anywhere under the page. */
  dialogs: ReactNode;
  /** A move is in flight; a second one would be dropped, so what starts one is disabled. */
  isMoving: boolean;
  /** A drop is reading its preview: a second drop would be dropped too, so drags wait for it. */
  isPreviewing: boolean;
  /**
   * Moves rows that were dropped on a gap or a folder: reads the preview, asks the confirmation the
   * mode needs, and moves. `selection` is the ticked rows when the drag carried them, else empty.
   */
  startDropMove: (drop: DropMove) => Promise<void>;
  /** Opens "Move to..." for these rows. */
  startMoveTo: (items: readonly TreeItem[]) => void;
  /**
   * Undoes the last move while its toast is on screen (Cmd/Ctrl+Z); false when there is none.
   */
  undoLast: () => boolean;
};

/** A move that a drop asks for. */
export type DropMove = {
  items: readonly TreeItem[];
  /**
   * The move did not start: the preview failed, the confirmation was dismissed, or another move was
   * in flight. For a caller that showed the move before asking (the keyboard reorder).
   */
  onAbandon?: () => void;
  /**
   * Called in the same turn as the move is applied to the rows, once it is confirmed: a caller
   * that showed the move before asking puts its own change back here, so the rows do not jump.
   */
  onBeforeApply?: () => void;
  /** Runs once the move went through, for what the caller keeps beside it (Move mode ends here). */
  onMoved?: () => void;
  /** The ticked rows when the drag carried the selection: those come back if the move fails. */
  selection: readonly TreeItem[] | null;
  target: MoveTarget;
  targetTitle: string;
};

type Pending = {
  items: readonly TreeItem[];
  onAbandon?: () => void;
  onBeforeApply?: () => void;
  onMoved?: () => void;
  /**
   * Every ticked row, nested ones included: what comes back if the move fails. `null` when the move
   * is not the selection's (a drag of one unticked row), so the ticks stay as they are.
   */
  selection: readonly TreeItem[] | null;
  target: MoveTarget;
  targetTitle: string;
};

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : "");

/**
 * The whole move from the toolbar: the picker, the confirmation the `confirmMoves` mode asks for,
 * the one move request through the shared store, and the Undo toast. Drag and drop and Move mode
 * enter the same way, with their own target.
 */
export const useMoveFlow = ({
  confirmMoves,
  enforceAllowedTypesOnMove,
  foldersSlug,
  languageCount,
  onMoved,
  onMoveFailed,
  store,
  translate,
  typeLabels,
}: MoveFlowOptions): MoveFlow => {
  const { closeModal, openModal } = useModal();
  const confirmSlug = useDialogSlug(confirmDialogSlug);
  const moveToSlug = useDialogSlug(moveDialogSlug);
  const [pickItems, setPickItems] = useState<readonly TreeItem[] | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [pickSession, setPickSession] = useState(0);
  const openings = useRef(0);
  const pending = useRef<Pending | null>(null);
  const selectionRef = useRef<readonly TreeItem[]>([]);
  const moving = useRef(false);
  // A drop reads its preview before it moves; a second drop in that time would be dropped too.
  const previewing = useRef(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  // The move whose Undo toast is on screen: Cmd/Ctrl+Z undoes it too (spec section 7.6).
  const lastUndo = useRef<{ run: () => void; toastId: number | string } | null>(null);
  // Requests that were confirmed, so a closing dialog does not count them as dismissed.
  const started = useRef(new WeakSet<Pending>());

  const context = useApiContext(store);

  const showFailure = useCallback(
    (error: unknown, title: string | null) => {
      const stale = error instanceof FoldersApiError && error.reason === "stale";
      const detail = messageOf(error);
      // A failure with its own title (an undo) keeps the server's words as the second line.
      const action = stale
        ? { label: translate("reload"), onClick: () => void store.refetchVisible() }
        : undefined;
      toast.error(title ?? (detail || translate("moveFailed")), {
        action,
        classNames: { actionButton: toastActionClass },
        description: title === null || detail === "" ? undefined : detail,
      });
    },
    [store, translate]
  );

  const undo = useCallback(
    async (outcome: MoveOutcome) => {
      const report = await undoMove({ context, store }, outcome);
      if (report.failure === null) {
        toast.success(translate("movedBack", { count: report.movedBack }));

        return;
      }
      showFailure(
        report.failure,
        report.movedBack > 0
          ? translate("movedBackPartial", { moved: report.movedBack, total: report.total })
          : translate("undoFailed")
      );
    },
    [context, showFailure, store, translate]
  );

  const execute = useCallback(
    async (request: Pending, redirects: boolean) => {
      if (moving.current) {
        return;
      }
      moving.current = true;
      setIsMoving(true);
      started.current.add(request);
      try {
        request.onBeforeApply?.();
        const outcome = await runMove(
          { context, store },
          rootsOfSelection(request.items),
          request.target,
          redirects
        );
        if (request.selection !== null) {
          onMoved();
        }
        request.onMoved?.();
        const runUndo = () => {
          lastUndo.current = null;
          void undo(outcome);
        };
        const forget = () => {
          if (lastUndo.current?.run === runUndo) {
            lastUndo.current = null;
          }
        };
        const toastId = toast.success(translate("moved", { count: outcome.result.moved.length }), {
          action: { label: translate("undo"), onClick: runUndo },
          classNames: { actionButton: toastActionClass },
          duration: undoToastDurationMs,
          onAutoClose: forget,
          onDismiss: forget,
        });
        lastUndo.current = { run: runUndo, toastId };
      } catch (error) {
        // The store already put every row back and read the folders again.
        showFailure(error, null);
        if (request.selection !== null) {
          onMoveFailed(request.selection);
        }
      } finally {
        moving.current = false;
        setIsMoving(false);
      }
    },
    [context, onMoved, onMoveFailed, showFailure, store, translate, undo]
  );

  // The confirmation the mode asks for, then the move: the picker and a drop end the same way.
  const proceed = useCallback(
    (request: Pending, preview: MovePreview) => {
      if (needsConfirmation(confirmMoves, preview)) {
        pending.current = request;
        openings.current += 1;
        setConfirmRequest({
          id: openings.current,
          items: rootsOfSelection(request.items),
          preview,
          targetTitle: request.targetTitle,
        });
        openModal(confirmSlug);

        return;
      }
      void execute(request, true);
    },
    [confirmMoves, confirmSlug, execute, openModal]
  );

  const choose = useCallback(
    (choice: MoveChoice) => {
      const items = pickItems;
      if (items === null) {
        return;
      }
      closeModal(moveToSlug);
      proceed(
        {
          items,
          selection: selectionRef.current,
          target: choice.target,
          targetTitle: choice.targetTitle,
        },
        choice.preview
      );
    },
    [closeModal, moveToSlug, pickItems, proceed]
  );

  const startDropMove = useCallback(
    async (drop: DropMove) => {
      if (moving.current || previewing.current) {
        drop.onAbandon?.();

        return;
      }
      previewing.current = true;
      setIsPreviewing(true);
      try {
        const roots = rootsOfSelection(drop.items);
        const preview = await previewMove(context, buildMoveBody(roots, drop.target));
        proceed(drop, preview);
      } catch (error) {
        showFailure(error, null);
        drop.onAbandon?.();
      } finally {
        previewing.current = false;
        setIsPreviewing(false);
      }
    },
    [context, proceed, showFailure]
  );

  // A confirmation that closes without the Move button was dismissed: whoever showed the move
  // before asking puts the rows back.
  const { modalState } = useModal();
  const isConfirmOpen = modalState[confirmSlug]?.isOpen === true;
  const wasConfirmOpen = useRef(false);
  useEffect(() => {
    if (isConfirmOpen) {
      wasConfirmOpen.current = true;

      return;
    }
    if (wasConfirmOpen.current) {
      wasConfirmOpen.current = false;
      const request = pending.current;
      if (request && !started.current.has(request)) {
        pending.current = null;
        request.onAbandon?.();
      }
    }
  }, [isConfirmOpen]);

  const undoLast = useCallback((): boolean => {
    const last = lastUndo.current;
    if (last === null) {
      return false;
    }
    toast.dismiss(last.toastId);
    last.run();

    return true;
  }, []);

  const startMoveTo = useCallback(
    (items: readonly TreeItem[]) => {
      selectionRef.current = items;
      setPickItems(rootsOfSelection(items));
      setPickSession((current) => current + 1);
      openModal(moveToSlug);
    },
    [moveToSlug, openModal]
  );

  const dialogs = (
    <>
      <MoveDialog
        busy={isMoving}
        context={context}
        enforceAllowedTypes={enforceAllowedTypesOnMove}
        foldersSlug={foldersSlug}
        items={pickItems}
        onChoose={choose}
        session={pickSession}
        store={store}
        translate={translate}
        typeLabels={typeLabels}
      />
      <ConfirmUrlChangeDialog
        busy={isMoving}
        languageCount={languageCount}
        onConfirm={async (redirects) => {
          const request = pending.current;
          if (request) {
            await execute(request, redirects);
          }
        }}
        onReload={() => {
          void store.refetchVisible();
          // A drag of a row that was not ticked carried no selection, so the ticks are not its to clear.
          if (pending.current?.selection !== null) {
            onMoved();
          }
        }}
        request={confirmRequest}
        translate={translate}
      />
    </>
  );

  return { dialogs, isMoving, isPreviewing, startDropMove, startMoveTo, undoLast };
};
