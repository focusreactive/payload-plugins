import {
  Button,
  DialogBody,
  DialogCancel,
  DialogFooter,
  DialogHeader,
  DialogModal,
} from "@payloadcms/ui";
import { useEffect, useState } from "react";

import type { TreeItem } from "../../types.js";
import { FoldersApiError, postPublish, previewPublish } from "../api.js";
import type { FoldersApiContext, PublishPreview, PublishResult } from "../api.js";
import type { Translate } from "../compat.js";
import { countText } from "./countText.js";
import { isPublishNoOp, publishSummaryOf, refusedCountOf, rootsOf } from "./operationLogic.js";
import type { PublishAction } from "./operationLogic.js";

export const publishDialogSlug = "fr-folders-publish";

/** What the dialog is open for: which action, on which rows. `null` while closed. */
export type PublishRequestView = { action: PublishAction; items: readonly TreeItem[] };

export type PublishDialogProps = {
  context: FoldersApiContext;
  /** How many languages the admin has; the language line shows with two or more. */
  languageCount: number;
  /** The admin locale: the one language a publish or unpublish changes. */
  locale: string | null;
  /** The action went through (done at once, or stored as an operation to step). */
  onPublished: (result: PublishResult, action: PublishAction, preview: PublishPreview) => void;
  request: PublishRequestView | null;
  /** One per opening, so the preview is read again every time. */
  session: number;
  translate: Translate;
  /** Page collection slug to label, for the "always live" list. */
  typeLabels: Readonly<Record<string, string>>;
};

type PreviewState =
  | { message: string; status: "error" }
  | { preview: PublishPreview; status: "ready" }
  | { status: "loading" };

const PublishContent = ({
  context,
  languageCount,
  locale,
  onPublished,
  request,
  translate,
  typeLabels,
}: Omit<PublishDialogProps, "request" | "session"> & { request: PublishRequestView }) => {
  const { action } = request;
  const roots = rootsOf(request.items);
  const itemRefs = roots.map(({ collection, id }) => ({ collection, id }));
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "loading" });
  const [isWorking, setIsWorking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const read = async () => {
      try {
        const preview = await previewPublish(
          context,
          { action, items: itemRefs, locale },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setPreviewState({ preview, status: "ready" });
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
    // The rows are fixed for one opening (`session` remounts this).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, context, locale]);

  const preview = previewState.status === "ready" ? previewState.preview : null;
  const summary = preview === null ? null : publishSummaryOf(preview);
  const isNoOp = preview === null || isPublishNoOp(preview);
  const isPublish = action === "publish";

  const questionOf = (counts: PublishPreview): string => {
    const pages = countText("pagesCount", counts.pages, translate);
    if (counts.folders === 0) {
      return translate(isPublish ? "publishQuestionPages" : "unpublishQuestionPages", { pages });
    }

    return translate(isPublish ? "publishQuestion" : "unpublishQuestion", {
      folders: countText("foldersCount", counts.folders, translate),
      pages,
    });
  };

  const confirm = async () => {
    if (preview === null || isNoOp || isWorking) {
      return;
    }
    setIsWorking(true);
    setFailure(null);
    try {
      const result = await postPublish(context, { action, items: itemRefs, locale });
      onPublished(result, action, preview);
    } catch (error) {
      if (error instanceof FoldersApiError && error.reason === "forbidden") {
        setFailure(
          translate(isPublish ? "publishRefused" : "unpublishRefused", {
            count: Math.max(1, refusedCountOf(error.data)),
          })
        );
      } else {
        setFailure(
          error instanceof Error && error.message !== ""
            ? error.message
            : translate("publishFailed")
        );
      }
      setIsWorking(false);
    }
  };

  return (
    <>
      <DialogHeader
        showClose
        title={
          preview === null
            ? translate(isPublish ? "publishHeading" : "unpublishHeading")
            : questionOf(preview)
        }
      />
      <DialogBody>
        <div className="fr-folders-confirm" data-testid="publish-dialog">
          {previewState.status === "loading" ? (
            <p className="fr-folders-muted" role="status">
              {translate("publishLoading")}
            </p>
          ) : null}
          {previewState.status === "error" ? (
            <p className="fr-folders-error" role="alert">
              {translate("publishPreviewFailed")}
              {previewState.message === "" ? "" : `: ${previewState.message}`}
            </p>
          ) : null}
          {preview !== null && summary !== null ? (
            <>
              <p data-testid="publish-body">
                {isNoOp
                  ? translate(isPublish ? "publishNothing" : "unpublishNothing")
                  : translate(isPublish ? "publishBody" : "unpublishBody")}
              </p>
              {languageCount > 1 && locale !== null ? (
                <p className="fr-folders-muted" data-testid="publish-language">
                  {translate("publishLanguage", { locale })}
                </p>
              ) : null}
              {summary.liveCollections.length > 0 ? (
                <ul className="fr-folders-confirm__list" data-testid="publish-live-list">
                  {summary.liveCollections.map(({ collection, count }) => (
                    <li key={collection}>
                      {translate("publishLiveItem", {
                        collection: typeLabels[collection] ?? collection,
                        count,
                      })}
                    </li>
                  ))}
                </ul>
              ) : null}
              {summary.unchangedCount > 0 ? (
                <p className="fr-folders-muted" data-testid="publish-unchanged">
                  {translate("publishUnchanged", { count: summary.unchangedCount })}
                </p>
              ) : null}
              {preview.isBatched ? (
                <p className="fr-folders-muted" data-testid="publish-batched">
                  {translate("publishBatched")}
                </p>
              ) : null}
            </>
          ) : null}
          {failure === null ? null : (
            <p className="fr-folders-error" data-testid="publish-failure" role="alert">
              {failure}
            </p>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogCancel label={translate("actionCancel")} />
        <Button
          disabled={isNoOp || isWorking}
          margin={false}
          onClick={() => void confirm()}
          size="medium"
        >
          {isWorking
            ? translate(isPublish ? "publishWorking" : "unpublishWorking")
            : translate(isPublish ? "actionPublish" : "actionUnpublish")}
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * The Publish and Unpublish dialog of spec section 7.10: the counts the server's dry run gives
 * ("Publish 37 pages in 3 folders?"), what they mean, collections without drafts listed as always
 * live and skipped, and a note when the run is large enough to be stepped.
 */
export const PublishDialog = ({ request, session, ...rest }: PublishDialogProps) => (
  <DialogModal className="fr-folders-dialog" size="medium" slug={publishDialogSlug}>
    {request === null ? null : <PublishContent key={session} request={request} {...rest} />}
  </DialogModal>
);
