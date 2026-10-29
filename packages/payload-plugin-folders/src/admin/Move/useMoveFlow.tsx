import { toast, useModal } from "@payloadcms/ui";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { ConfirmMoves, TreeItem } from "../../types.js";
import { FoldersApiError } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import type { TreeStore } from "../store.js";
import { confirmDialogSlug, ConfirmUrlChangeDialog } from "./ConfirmUrlChangeDialog.js";
import type { ConfirmRequest } from "./ConfirmUrlChangeDialog.js";
import { MoveDialog, moveDialogSlug } from "./MoveDialog.js";
import type { MoveChoice } from "./MoveDialog.js";
import { needsConfirmation, rootsOfSelection, runMove, undoMove } from "./moveFlow.js";
import type { MoveOutcome, MoveTarget } from "./moveFlow.js";

/** The class the toast action button wears, so the stylesheet can align it with the title. */
export const toastActionClass = "fr-folders-toast-action";

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
  /** Opens "Move to..." for these rows. */
  startMoveTo: (items: readonly TreeItem[]) => void;
};

type Pending = {
  items: readonly TreeItem[];
  /** Every ticked row, nested ones included: what comes back if the move fails. */
  selection: readonly TreeItem[];
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
  const [pickItems, setPickItems] = useState<readonly TreeItem[] | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [pickSession, setPickSession] = useState(0);
  const openings = useRef(0);
  const pending = useRef<Pending | null>(null);
  const selectionRef = useRef<readonly TreeItem[]>([]);
  const moving = useRef(false);
  const [isMoving, setIsMoving] = useState(false);

  const options = store.getOptions();
  const baseUrl = options?.baseUrl ?? "";
  const fetchImplementation = options?.fetchImplementation;
  const context = useMemo<FoldersApiContext>(
    () => ({ baseUrl, fetchImplementation }),
    [baseUrl, fetchImplementation]
  );

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
      try {
        const outcome = await runMove(
          { context, store },
          rootsOfSelection(request.items),
          request.target,
          redirects
        );
        onMoved();
        toast.success(translate("moved", { count: outcome.result.moved.length }), {
          action: { label: translate("undo"), onClick: () => void undo(outcome) },
          classNames: { actionButton: toastActionClass },
          duration: undoToastDurationMs,
        });
      } catch (error) {
        // The store already put every row back and read the folders again.
        showFailure(error, null);
        onMoveFailed(request.selection);
      } finally {
        moving.current = false;
        setIsMoving(false);
      }
    },
    [context, onMoved, onMoveFailed, showFailure, store, translate, undo]
  );

  const choose = useCallback(
    (choice: MoveChoice) => {
      const items = pickItems;
      if (items === null) {
        return;
      }
      const request: Pending = {
        items,
        selection: selectionRef.current,
        target: choice.target,
        targetTitle: choice.targetTitle,
      };
      closeModal(moveDialogSlug);
      if (needsConfirmation(confirmMoves, choice.preview)) {
        pending.current = request;
        openings.current += 1;
        setConfirmRequest({
          id: openings.current,
          items: rootsOfSelection(items),
          preview: choice.preview,
          targetTitle: choice.targetTitle,
        });
        openModal(confirmDialogSlug);

        return;
      }
      void execute(request, true);
    },
    [closeModal, confirmMoves, execute, openModal, pickItems]
  );

  const startMoveTo = useCallback(
    (items: readonly TreeItem[]) => {
      selectionRef.current = items;
      setPickItems(rootsOfSelection(items));
      setPickSession((current) => current + 1);
      openModal(moveDialogSlug);
    },
    [openModal]
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
          onMoved();
        }}
        request={confirmRequest}
        translate={translate}
      />
    </>
  );

  return { dialogs, isMoving, startMoveTo };
};
