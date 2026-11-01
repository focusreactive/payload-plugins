import {
  Button,
  DialogBody,
  DialogCancel,
  DialogFooter,
  DialogHeader,
  DialogModal,
} from "@payloadcms/ui";
import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";

import type { RepairResult } from "../../core/repair.js";
import { postRepair } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import { repairListingOf } from "./repairLogic.js";
import type { RepairList } from "./repairLogic.js";

export const repairDialogSlug = "fr-folders-repair";

export type RepairDialogProps = {
  context: FoldersApiContext;
  /** The repair went through. */
  onRepaired: (result: RepairResult) => void;
  /** One per opening, so a second opening starts with a fresh dry run. */
  session: number;
  /** False while the dialog is closed: it reads nothing then. */
  isOpen: boolean;
  translate: Translate;
};

type PreviewState =
  | { message: string; status: "error" }
  | { result: RepairResult; status: "ready" }
  | { status: "loading" };

const IssueList = ({
  heading,
  list,
  testId,
  translate,
}: {
  heading: string;
  list: RepairList;
  testId: string;
  translate: Translate;
}) => (
  <div className="fr-folders-confirm__block" data-testid={testId}>
    <p className="fr-folders-confirm__label">{heading}</p>
    <ul className="fr-folders-confirm__list">
      {list.lines.map((line, index) => (
        // The sentences can repeat (the same fix for several folders), so the position is the key.
        // eslint-disable-next-line react/no-array-index-key
        <li key={`${index}:${line}`}>{line}</li>
      ))}
    </ul>
    {list.more > 0 ? (
      <p className="fr-folders-muted" data-testid={`${testId}-more`}>
        {translate("repairMore", { count: list.more })}
      </p>
    ) : null}
  </div>
);

const RepairContent = ({
  context,
  onRepaired,
  translate,
}: Omit<RepairDialogProps, "isOpen" | "session">) => {
  const formId = useId();
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "loading" });
  const [isRepairing, setIsRepairing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // The dry run: what would be fixed and what is left, with nothing written.
  useEffect(() => {
    const controller = new AbortController();
    const read = async () => {
      try {
        const result = await postRepair(context, { dryRun: true }, controller.signal);
        if (!controller.signal.aborted) {
          setPreviewState({ result, status: "ready" });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setPreviewState({
            message: error instanceof Error ? error.message : "",
            status: "error",
          });
        }
      }
    };
    void read();

    return () => controller.abort();
  }, [context]);

  const listing = previewState.status === "ready" ? repairListingOf(previewState.result) : null;
  const canRepair = listing?.isRepairable === true && !isRepairing;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canRepair) {
      return;
    }
    setIsRepairing(true);
    setFailure(null);
    try {
      onRepaired(await postRepair(context, { dryRun: false }));
    } catch (error) {
      setFailure(
        error instanceof Error && error.message !== "" ? error.message : translate("repairFailed")
      );
      setIsRepairing(false);
    }
  };

  return (
    <>
      <DialogHeader showClose title={translate("repairTitle")} />
      <DialogBody>
        <form
          className="fr-folders-confirm"
          data-testid="repair-dialog"
          id={formId}
          onSubmit={submit}
        >
          <p className="fr-folders-muted">{translate("repairIntro")}</p>
          {previewState.status === "loading" ? (
            <p className="fr-folders-muted" role="status">
              {translate("repairLoading")}
            </p>
          ) : null}
          {previewState.status === "error" ? (
            <p className="fr-folders-error" role="alert">
              {translate("repairPreviewFailed")}
              {previewState.message === "" ? "" : `: ${previewState.message}`}
            </p>
          ) : null}
          {listing === null ? null : (
            <>
              {listing.isClean ? (
                <p data-testid="repair-clean">{translate("repairNothing")}</p>
              ) : null}
              {listing.fixed.total > 0 ? (
                <>
                  <IssueList
                    heading={translate("repairFixedHeading", { count: listing.fixed.total })}
                    list={listing.fixed}
                    testId="repair-fixed"
                    translate={translate}
                  />
                  {listing.urlChanges > 0 ? (
                    <p data-testid="repair-url-changes">
                      {translate("repairUrlChanges", { count: listing.urlChanges })}
                    </p>
                  ) : null}
                </>
              ) : null}
              {listing.conflicts.total > 0 ? (
                <>
                  <IssueList
                    heading={translate("repairConflictsHeading", {
                      count: listing.conflicts.total,
                    })}
                    list={listing.conflicts}
                    testId="repair-conflicts"
                    translate={translate}
                  />
                  <p className="fr-folders-muted">{translate("repairConflictsHint")}</p>
                </>
              ) : null}
            </>
          )}
          {failure === null ? null : (
            <p className="fr-folders-error" data-testid="repair-failure" role="alert">
              {failure}
            </p>
          )}
        </form>
      </DialogBody>
      <DialogFooter>
        <DialogCancel label={translate("actionCancel")} />
        <Button
          disabled={!canRepair}
          extraButtonProps={{ form: formId, "data-testid": "repair-submit" }}
          margin={false}
          size="medium"
          type="submit"
        >
          {isRepairing ? translate("repairRunning") : translate("repairButton")}
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * The Rebuild full URLs dialog (spec section 5.9): the dry run first, what repair would fix and
 * what it leaves for a person (counts, the first lines of each, "and N more"), then the repair
 * itself on the button. The dry run reads as the dialog opens, so it is never older than the
 * click that opened it.
 */
export const RepairDialog = ({ isOpen, session, ...rest }: RepairDialogProps) => (
  <DialogModal className="fr-folders-dialog" size="medium" slug={repairDialogSlug}>
    {isOpen ? <RepairContent key={session} {...rest} /> : null}
  </DialogModal>
);
