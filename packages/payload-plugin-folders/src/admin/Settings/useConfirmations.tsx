import {
  DialogBody,
  DialogCancel,
  DialogConfirm,
  DialogFooter,
  DialogHeader,
  DialogModal,
  useModal,
} from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { Translate } from "../compat.js";
import { ConfirmUrlChangeDialog } from "../Move/ConfirmUrlChangeDialog.js";
import type { ConfirmRequest } from "../Move/ConfirmUrlChangeDialog.js";

export const settingsConfirmSlug = "fr-folders-settings-confirm-url";
export const settingsActionConfirmSlug = "fr-folders-settings-confirm-action";

/** A plain question with a confirm button, for what is not a URL change (locking subfolder types). */
export type ActionConfirmRequest = {
  body: string;
  confirmLabel: string;
  id: number;
  title: string;
};

export type Confirmations = {
  /** Asks the lock question; `true` when the editor confirmed. */
  askAction: (request: Omit<ActionConfirmRequest, "id">) => Promise<boolean>;
  /** Asks the URL-change question of the settings saves; `true` when the editor confirmed. */
  askUrlChange: (request: Omit<ConfirmRequest, "id">) => Promise<boolean>;
  /** The dialogs; render them once, anywhere under the page. */
  dialogs: ReactNode;
};

/**
 * Two questions the settings drawers ask in the middle of a save, as promises: the save waits for
 * the answer, and closing the dialog by any other way than Confirm answers `false`.
 */
export const useConfirmations = ({
  languageCount,
  translate,
}: {
  languageCount: number;
  translate: Translate;
}): Confirmations => {
  const { modalState, openModal } = useModal();
  const [urlRequest, setUrlRequest] = useState<ConfirmRequest | null>(null);
  const [actionRequest, setActionRequest] = useState<ActionConfirmRequest | null>(null);
  const urlAnswer = useRef<((answer: boolean) => void) | null>(null);
  const actionAnswer = useRef<((answer: boolean) => void) | null>(null);
  const openings = useRef(0);

  const askUrlChange = useCallback(
    (request: Omit<ConfirmRequest, "id">) =>
      new Promise<boolean>((resolve) => {
        openings.current += 1;
        urlAnswer.current = resolve;
        setUrlRequest({ ...request, id: openings.current });
        openModal(settingsConfirmSlug);
      }),
    [openModal]
  );
  const askAction = useCallback(
    (request: Omit<ActionConfirmRequest, "id">) =>
      new Promise<boolean>((resolve) => {
        openings.current += 1;
        actionAnswer.current = resolve;
        setActionRequest({ ...request, id: openings.current });
        openModal(settingsActionConfirmSlug);
      }),
    [openModal]
  );

  // A dialog that closed with its question unanswered was cancelled.
  const wasUrlOpen = useRef(false);
  const wasActionOpen = useRef(false);
  const isUrlOpen = Boolean(modalState[settingsConfirmSlug]?.isOpen);
  const isActionOpen = Boolean(modalState[settingsActionConfirmSlug]?.isOpen);
  useEffect(() => {
    if (wasUrlOpen.current && !isUrlOpen) {
      urlAnswer.current?.(false);
      urlAnswer.current = null;
    }
    wasUrlOpen.current = isUrlOpen;
  }, [isUrlOpen]);
  useEffect(() => {
    if (wasActionOpen.current && !isActionOpen) {
      actionAnswer.current?.(false);
      actionAnswer.current = null;
    }
    wasActionOpen.current = isActionOpen;
  }, [isActionOpen]);

  const dialogs = (
    <>
      <ConfirmUrlChangeDialog
        busy={false}
        languageCount={languageCount}
        onConfirm={async () => {
          urlAnswer.current?.(true);
          urlAnswer.current = null;
        }}
        onReload={() => undefined}
        request={urlRequest}
        slug={settingsConfirmSlug}
        translate={translate}
      />
      <DialogModal className="fr-folders-dialog" size="small" slug={settingsActionConfirmSlug}>
        {actionRequest === null ? null : (
          <div key={actionRequest.id}>
            <DialogHeader showClose title={actionRequest.title} />
            <DialogBody>
              <p data-testid="confirm-action-body">{actionRequest.body}</p>
            </DialogBody>
            <DialogFooter>
              <DialogCancel label={translate("actionCancel")} />
              <DialogConfirm
                label={actionRequest.confirmLabel}
                onClick={async () => {
                  actionAnswer.current?.(true);
                  actionAnswer.current = null;
                }}
              />
            </DialogFooter>
          </div>
        )}
      </DialogModal>
    </>
  );

  return { askAction, askUrlChange, dialogs };
};
