import {
  Button,
  DialogBody,
  DialogCancel,
  DialogFooter,
  DialogHeader,
  DialogModal,
  useModal,
} from "@payloadcms/ui";
import { useEffect, useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { FolderId } from "../../types.js";
import { fetchCheckSegment } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import { SlugField } from "../Create/SlugField.js";
import { useSegmentCheck } from "../Create/useSegmentCheck.js";
import { chooseUnrootSegment, unrootedPathOf } from "./unroot.js";

export const unrootDialogSlug = "fr-folders-unroot";

/** The page that stops being its folder's root page. */
export type UnrootRequest = {
  /** The page's collection and id, so the page itself never counts as the one taking the segment. */
  collection: string;
  /** The locale the segment is written in. */
  locale: string | null;
  folderId: FolderId | null;
  /** The folder's path in the admin locale, `/` at the top level. */
  folderPath: string;
  id: FolderId;
  /** One per opening, so the dialog starts from the page's own values every time. */
  session: number;
  /** The segment the page has stored, which a root page keeps but does not show in its URL. */
  storedSlug: string | null;
  title: string;
  /**
   * The page is published and goes live with this save, so its URL changes at once. `null` when the
   * editor chooses by pressing Save or Publish in the edit form afterwards.
   */
  willGoLive: boolean | null;
};

export type UnrootDialogProps = {
  apiContext: FoldersApiContext;
  /** Takes the chosen segment; the dialog closes when it resolves, and shows what it throws. */
  onConfirm: (segment: string) => Promise<void> | void;
  request: UnrootRequest | null;
  translate: Translate;
};

const unrootFocusOptions = {
  initialFocus: () =>
    document.querySelector<HTMLElement>('[data-testid="unroot-segment"] input') ?? undefined,
};

const UnrootContent = ({
  apiContext,
  onConfirm,
  request,
  translate,
}: Omit<UnrootDialogProps, "request"> & { request: UnrootRequest }): ReactNode => {
  const { closeModal } = useModal();
  const formId = useId();
  const [segment, setSegment] = useState("");
  const [isChoosing, setIsChoosing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { collection, folderId, id, locale, storedSlug, title } = request;

  // Starts from the stored slug when it is valid and free, else from the title (spec section 4).
  useEffect(() => {
    let isCurrent = true;
    const choose = async () => {
      try {
        const chosen = await chooseUnrootSegment({
          atSiteRoot: folderId === null,
          isFree: async (candidate) =>
            (
              await fetchCheckSegment(apiContext, {
                exclude: { collection, id },
                locale,
                parent: folderId,
                segment: candidate,
              })
            ).ok,
          storedSlug,
          title,
        });
        if (isCurrent) {
          setSegment(chosen);
        }
      } catch {
        // The field stays editable and its own check reports what is wrong.
        if (isCurrent) {
          setSegment(storedSlug ?? "");
        }
      } finally {
        if (isCurrent) {
          setIsChoosing(false);
        }
      }
    };
    void choose();

    return () => {
      isCurrent = false;
    };
  }, [apiContext, collection, folderId, id, locale, storedSlug, title]);

  const check = useSegmentCheck({
    context: apiContext,
    exclude: { collection, id },
    locale,
    parent: folderId,
    segment,
  });
  const canConfirm = !isChoosing && check.state === "ok" && !isSaving;
  const resultPath = unrootedPathOf(request.folderPath, segment);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // The dialog sits in a portal under the page's edit form in the React tree, and a React submit
    // event bubbles through portals: without this the edit form would save the page as well.
    event.stopPropagation();
    if (!canConfirm) {
      return;
    }
    setIsSaving(true);
    setFailure(null);
    try {
      await onConfirm(segment);
      closeModal(unrootDialogSlug);
    } catch (error) {
      setFailure(
        error instanceof Error && error.message !== "" ? error.message : translate("unrootFailed")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DialogHeader showClose title={translate("unrootTitle")} />
      <DialogBody>
        <form className="fr-folders-form" data-testid="unroot-form" id={formId} onSubmit={submit}>
          <p>{translate("unrootIntro", { folder: request.folderPath, title: request.title })}</p>
          <div data-testid="unroot-segment">
            <SlugField
              inputId={`${formId}-segment`}
              isLinked={false}
              linkable={false}
              onChange={setSegment}
              onRelink={() => undefined}
              parentPath={request.folderPath}
              status={check}
              translate={translate}
              value={segment}
            />
          </div>
          {segment === "" ? null : (
            <p className="fr-folders-field__hint" data-testid="unroot-url">
              {translate("unrootResult", { path: resultPath })}
            </p>
          )}
          <p className="fr-folders-field__hint" data-testid="unroot-timing">
            {translate(
              request.willGoLive === null
                ? "unrootFormHint"
                : request.willGoLive
                  ? "unrootLiveHint"
                  : "unrootDraftHint"
            )}
          </p>
          {failure === null ? null : (
            <p className="fr-folders-error" data-testid="unroot-failure" role="alert">
              {failure}
            </p>
          )}
        </form>
      </DialogBody>
      <DialogFooter>
        <DialogCancel label={translate("actionCancel")} />
        <Button
          disabled={!canConfirm}
          extraButtonProps={{ form: formId }}
          margin={false}
          size="medium"
          type="submit"
        >
          {translate(isSaving ? "unrootSaving" : "unrootConfirm")}
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * "Choose this page's own URL segment" (spec section 4): un-setting a root page always asks,
 * because Storyblok's silent `company/company` is the trap this avoids. The segment starts from the
 * stored slug when it is valid and free, else from the title with `-2`, `-3`, and its check shows
 * the URL it gives. The caller saves the choice, so the context menu and the page settings write
 * it straight away while the edit view puts it into its form.
 */
export const UnrootDialog = ({ request, ...rest }: UnrootDialogProps) => (
  <DialogModal
    className="fr-folders-dialog"
    focusTrapOptions={unrootFocusOptions}
    size="medium"
    slug={unrootDialogSlug}
  >
    {request === null ? null : <UnrootContent key={request.session} request={request} {...rest} />}
  </DialogModal>
);
