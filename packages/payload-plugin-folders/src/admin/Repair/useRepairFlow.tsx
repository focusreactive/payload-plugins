import { toast, useModal } from "@payloadcms/ui";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import type { RepairResult } from "../../core/repair.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import type { TreeStore } from "../store.js";
import { RepairDialog, repairDialogSlug } from "./RepairDialog.js";

export type RepairFlow = {
  /** The dialog; render it once, anywhere under the page. */
  dialog: ReactNode;
  /** Opens the dialog, which starts with the dry run. */
  start: () => void;
};

/**
 * Rebuild full URLs from the tree view (spec section 5.9): the dialog with its dry run, the
 * repair, then the tree read again (the paths of the folders changed) and the quick verify run
 * again, which is what takes the drift banner away.
 */
export const useRepairFlow = ({
  apiContext,
  onRepaired,
  store,
  translate,
}: {
  apiContext: FoldersApiContext;
  /** Runs after the repair and the read of the tree; the quick verify belongs here. */
  onRepaired: () => Promise<void>;
  store: TreeStore;
  translate: Translate;
}): RepairFlow => {
  const { closeModal, openModal } = useModal();
  const [session, setSession] = useState(0);

  const start = useCallback(() => {
    setSession((current) => current + 1);
    openModal(repairDialogSlug);
  }, [openModal]);

  const handleRepaired = useCallback(
    async (result: RepairResult) => {
      closeModal(repairDialogSlug);
      const left = result.conflicts.total;
      toast.success(
        left > 0 ? translate("repairDoneWithConflicts", { count: left }) : translate("repairDone")
      );
      await store.refetchVisible();
      await onRepaired();
    },
    [closeModal, onRepaired, store, translate]
  );

  return {
    dialog: (
      <RepairDialog
        context={apiContext}
        isOpen={session > 0}
        onRepaired={(result) => void handleRepaired(result)}
        session={session}
        translate={translate}
      />
    ),
    start,
  };
};
