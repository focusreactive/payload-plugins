import {
  Button,
  DialogBody,
  DialogCancel,
  DialogFooter,
  DialogHeader,
  DialogModal,
} from "@payloadcms/ui";

import type { FolderId } from "../../types.js";
import type { Translate } from "../compat.js";
import { percentOf, titleKeyOf } from "./operationLogic.js";
import type { OperationView } from "./operationLogic.js";

export const progressDialogSlug = "fr-folders-progress";

export type ProgressDialogProps = {
  /** Steps a failed operation again. */
  onRetry: (id: FolderId) => void;
  /** The operation shown; `null` while the dialog is closed. */
  operation: OperationView | null;
  translate: Translate;
};

const ProgressContent = ({
  onRetry,
  operation,
  translate,
}: Omit<ProgressDialogProps, "operation"> & { operation: OperationView }) => {
  const percent = percentOf(operation);
  const isDone = operation.status === "done";
  const isFailed = operation.status === "failed";

  return (
    <>
      <DialogHeader
        showClose
        title={translate(titleKeyOf(operation.kind), {
          count: operation.total,
          total: operation.total,
        })}
      />
      <DialogBody>
        <div
          className="fr-folders-progress"
          data-status={operation.status}
          data-testid="progress-dialog"
        >
          <progress
            aria-label={translate("progressLabel")}
            className="fr-folders-progress__bar"
            data-testid="progress-bar"
            max={100}
            value={percent}
          />
          <p aria-live="polite" data-testid="progress-count" role="status">
            {translate("progressCount", { done: operation.done, total: operation.total })}
          </p>
          {isDone ? <p data-testid="progress-done">{translate("progressDone")}</p> : null}
          {isFailed ? (
            <p className="fr-folders-error" data-testid="progress-failure" role="alert">
              {translate("progressFailed")}
              {operation.error === undefined ? "" : `: ${operation.error}`}
            </p>
          ) : null}
          {isDone || isFailed ? null : (
            <p className="fr-folders-muted" data-testid="progress-hint">
              {translate("progressHint")}
            </p>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        {isFailed ? (
          <Button margin={false} onClick={() => onRetry(operation.id)} size="medium">
            {translate("retry")}
          </Button>
        ) : null}
        <DialogCancel label={translate(isDone ? "progressClose" : "progressCloseKeepGoing")} />
      </DialogFooter>
    </>
  );
};

/**
 * The progress of a stepped operation (spec section 5.8): a bar and "400 of 980". Closing it does
 * not stop the work; the tree shows a banner that goes on stepping. A failed step shows its error
 * and a retry.
 */
export const ProgressDialog = ({ operation, ...rest }: ProgressDialogProps) => (
  <DialogModal className="fr-folders-dialog" size="small" slug={progressDialogSlug}>
    {operation === null ? null : <ProgressContent operation={operation} {...rest} />}
  </DialogModal>
);
