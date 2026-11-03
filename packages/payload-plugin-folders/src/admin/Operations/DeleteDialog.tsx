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

import { useDialogSlug } from "../dialogScope.js";
import type { TreeItem } from "../../types.js";
import { FoldersApiError, postDelete, previewDelete } from "../api.js";
import type { DeletePreview, DeleteResult, FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import type { DeleteListingRow } from "./operationLogic.js";
import {
  deleteHeadlineOf,
  deleteListingOf,
  isDeleteConfirmed,
  refusedCountOf,
  rootsOf,
} from "./operationLogic.js";
import { countText } from "./countText.js";

export const deleteDialogSlug = "fr-folders-delete";

export type DeleteDialogProps = {
  context: FoldersApiContext;
  /** The rows to delete. `null` while the dialog is closed. */
  items: readonly TreeItem[] | null;
  /** The delete went through (done at once, or stored as an operation to step). */
  onDeleted: (result: DeleteResult, preview: DeletePreview) => void;
  /** One per opening, so the typed word starts empty every time. */
  session: number;
  translate: Translate;
};

type PreviewState =
  | { message: string; status: "error" }
  | { preview: DeletePreview; status: "ready" }
  | { status: "loading" };

// Payload's dialog puts the focus on its heading when it opens; the word to type is the first
// thing the editor does here, so it gets the focus when there is one.
const deleteFocusOptions = {
  initialFocus: () =>
    document.querySelector<HTMLElement>('[data-testid="delete-confirm-input"]') ?? undefined,
};

const statusKeys = {
  changed: "statusChanged",
  draft: "statusDraft",
  live: "statusLive",
  published: "statusPublished",
} as const;

/** What follows a path in the listing: the kind of row, or the page's status. */
const rowLabelOf = (row: DeleteListingRow, translate: Translate): string => {
  if (row.isFolder) {
    return translate("folder");
  }
  if (row.isRootPage) {
    return translate("rootPage");
  }
  const key = statusKeys[row.status as keyof typeof statusKeys];

  return key === undefined ? (row.status ?? "") : translate(key);
};

const DeleteContent = ({
  context,
  items,
  onDeleted,
  translate,
}: Omit<DeleteDialogProps, "items" | "session"> & { items: readonly TreeItem[] }) => {
  const formId = useId();
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "loading" });
  const [typed, setTyped] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const roots = rootsOf(items);
  const itemRefs = roots.map(({ collection, id }) => ({ collection, id }));

  useEffect(() => {
    const controller = new AbortController();
    const read = async () => {
      try {
        const preview = await previewDelete(context, itemRefs, controller.signal);
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
  }, [context]);

  const headline = deleteHeadlineOf(roots);
  const preview = previewState.status === "ready" ? previewState.preview : null;
  const canDelete =
    preview !== null && isDeleteConfirmed(preview.confirmWord, typed) && !isDeleting;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (preview === null || !canDelete) {
      return;
    }
    setIsDeleting(true);
    setFailure(null);
    try {
      const result = await postDelete(context, {
        ...(preview.confirmWord === null ? {} : { confirmWord: typed.trim() }),
        items: itemRefs,
      });
      onDeleted(result, preview);
    } catch (error) {
      // A refusal names how many documents it is about, never which: the user may not read them.
      if (error instanceof FoldersApiError && error.reason === "forbidden") {
        const count = refusedCountOf(error.data);
        setFailure(
          count > 0 ? translate("deleteRefused", { count }) : translate("deleteRefusedAll")
        );
      } else {
        setFailure(
          error instanceof Error && error.message !== "" ? error.message : translate("deleteFailed")
        );
      }
      setIsDeleting(false);
    }
  };

  const listing = preview === null ? null : deleteListingOf(preview);
  const isSinglePage = roots.length === 1 && roots[0].kind === "page";

  return (
    <>
      <DialogHeader showClose title={translate(headline.key, headline.variables)} />
      <DialogBody>
        <form
          className="fr-folders-confirm"
          data-testid="delete-dialog"
          id={formId}
          onSubmit={submit}
        >
          {previewState.status === "loading" ? (
            <p className="fr-folders-muted" role="status">
              {translate("deleteLoading")}
            </p>
          ) : null}
          {previewState.status === "error" ? (
            <p className="fr-folders-error" role="alert">
              {translate("deletePreviewFailed")}
              {previewState.message === "" ? "" : `: ${previewState.message}`}
            </p>
          ) : null}
          {preview !== null && listing !== null ? (
            <>
              {isSinglePage ? (
                <p data-testid="delete-summary">
                  {preview.publishedUrls > 0
                    ? translate("deletePageUrlStops", { path: roots[0].fullPath })
                    : translate("deletePageNoUrl")}
                </p>
              ) : (
                <p data-testid="delete-summary">
                  {translate("deleteSummary", {
                    folders: countText("foldersCount", preview.folders, translate),
                    pages: countText("pagesCount", preview.pages, translate),
                  })}{" "}
                  {preview.publishedUrls > 0
                    ? translate("deleteUrlsStop", { count: preview.publishedUrls })
                    : translate("deleteNoUrlStops")}
                </p>
              )}
              {preview.inTrash > 0 ? (
                <p className="fr-folders-muted" data-testid="delete-in-trash">
                  {translate("deleteIncludingTrash", { count: preview.inTrash })}
                </p>
              ) : null}
              {listing.rootPageCount > 0 ? (
                <p className="fr-folders-muted" data-testid="delete-root-pages">
                  {translate("deleteRootPages", { count: listing.rootPageCount })}
                </p>
              ) : null}
              {isSinglePage ? null : (
                <div className="fr-folders-confirm__block">
                  <ul className="fr-folders-confirm__list" data-testid="delete-listing">
                    {listing.rows.map((row, index) => (
                      <li key={`${row.path}:${row.status ?? "folder"}:${index}`}>
                        <code>{row.path}</code>{" "}
                        <span className="fr-folders-muted">{rowLabelOf(row, translate)}</span>
                      </li>
                    ))}
                  </ul>
                  {listing.moreCount > 0 ? (
                    <p className="fr-folders-muted" data-testid="delete-more">
                      {translate("deleteMore", { count: listing.moreCount })}
                    </p>
                  ) : null}
                </div>
              )}
              <p data-testid="delete-trash-note">
                {preview.trash ? translate("deleteTrash") : translate("deletePermanent")}
              </p>
              {preview.confirmWord === null ? null : (
                <div className="fr-folders-field">
                  <label className="fr-folders-field__label" htmlFor={`${formId}-word`}>
                    {translate("deleteTypeToConfirm", { word: preview.confirmWord })}
                  </label>
                  <input
                    autoComplete="off"
                    className="fr-folders-input"
                    data-testid="delete-confirm-input"
                    id={`${formId}-word`}
                    onChange={(event) => setTyped(event.target.value)}
                    spellCheck={false}
                    type="text"
                    value={typed}
                  />
                </div>
              )}
            </>
          ) : null}
          {failure === null ? null : (
            <p className="fr-folders-error" data-testid="delete-failure" role="alert">
              {failure}
            </p>
          )}
        </form>
      </DialogBody>
      <DialogFooter>
        <DialogCancel label={translate("actionCancel")} />
        <Button
          buttonStyle="destructive"
          disabled={!canDelete}
          extraButtonProps={{ form: formId }}
          margin={false}
          size="medium"
          type="submit"
        >
          {isDeleting
            ? translate("deleteDeleting")
            : preview?.trash === true
              ? translate("deleteButtonTrash")
              : translate("deleteButton")}
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * The Delete dialog of spec section 7.10: what goes (folders, pages with their status, the first
 * 50 and "and N more"), how many published URLs stop working, the trash or permanent wording, and
 * above 10 pages the word to type. A refusal by access stays in the dialog and removes nothing.
 */
export const DeleteDialog = ({ items, session, ...rest }: DeleteDialogProps) => (
  <DialogModal
    className="fr-folders-dialog"
    focusTrapOptions={deleteFocusOptions}
    size="medium"
    slug={useDialogSlug(deleteDialogSlug)}
  >
    {items === null ? null : <DeleteContent items={items} key={session} {...rest} />}
  </DialogModal>
);
