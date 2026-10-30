import {
  CheckboxInput,
  DialogBody,
  DialogCancel,
  DialogConfirm,
  DialogFooter,
  DialogHeader,
  DialogModal,
  Button,
  useModal,
} from "@payloadcms/ui";
import { useState } from "react";

import type { ItemRef, TreeItem } from "../../types.js";
import type { Translate } from "../compat.js";
import type { MovePreview } from "../api.js";
import { itemKeyOf } from "../store.js";

export const confirmDialogSlug = "fr-folders-confirm-move";

export type ConfirmRequest = {
  /** The button's label while it works; "Moving..." unless the question is not about a move. */
  confirmingLabel?: string;
  /** The button's label; "Move" unless the question is not about a move. */
  confirmLabel?: string;
  /** One per opening, so the checkbox starts ticked again every time. */
  id: number;
  /** The rows being moved, for naming a refused item. */
  items: readonly TreeItem[];
  preview: MovePreview;
  /** The destination's name as the editor reads it. */
  targetTitle: string;
  /** The question; "Move N items to ..." unless the question is not about a move. */
  title?: string;
};

export type ConfirmUrlChangeDialogProps = {
  /** A move is in flight: the confirm button is off, so a second move cannot start. */
  busy: boolean;
  /** How many languages the admin has; the "across N languages" count shows with two or more. */
  languageCount: number;
  /** Runs the move; `redirects` is the checkbox. The dialog closes when it resolves. */
  onConfirm: (redirects: boolean) => Promise<void>;
  /** The tree changed under the editor: read it again. */
  onReload: () => void;
  request: ConfirmRequest | null;
  /** The dialog's modal slug; a second question of another flow needs its own. */
  slug?: string;
  translate: Translate;
};

const titleOf = (items: readonly TreeItem[], ref: ItemRef): string =>
  items.find((item) => itemKeyOf(item) === itemKeyOf(ref))?.title ?? `${ref.collection} ${ref.id}`;

const Summary = ({
  languageCount,
  preview,
  translate,
}: {
  languageCount: number;
  preview: MovePreview;
  translate: Translate;
}) => {
  const { draftOnly, published, publishedAcrossLocales } = preview.urlChanges;
  const parts: string[] = [];
  if (published > 0) {
    const acrossLanguages =
      languageCount > 1 && publishedAcrossLocales > published
        ? ` ${translate("confirmUrlsAcrossLanguages", {
            count: publishedAcrossLocales,
            languages: languageCount,
          })}`
        : "";
    parts.push(`${translate("confirmUrlsChange", { count: published })}${acrossLanguages}.`);
  } else {
    parts.push(translate("confirmNoUrlChange"));
  }
  if (draftOnly > 0) {
    parts.push(translate("confirmDraftPages", { count: draftOnly }));
  }

  return (
    <p className="fr-folders-confirm__summary" data-testid="url-change-summary">
      {parts.join(" ")}
    </p>
  );
};

/**
 * Asks before a move that changes published URLs (spec section 5.7): how many change, a few
 * examples, whether to leave redirects, and, when the move is refused, why. A refused move has no
 * Move button, only the reasons.
 */
const ConfirmContent = ({
  busy,
  languageCount,
  onConfirm,
  onReload,
  request,
  slug = confirmDialogSlug,
  translate,
}: Omit<ConfirmUrlChangeDialogProps, "request"> & { request: ConfirmRequest }) => {
  const { closeModal } = useModal();
  // Ticked by default, and ticked again for every move: the state lives and dies with one opening.
  const [redirects, setRedirects] = useState(true);

  return (
    <>
      <DialogHeader
        showClose
        title={
          request.title ??
          translate("confirmTitle", { count: request.items.length, target: request.targetTitle })
        }
      />
      <DialogBody>
        <div className="fr-folders-confirm" data-testid="confirm-move">
          {request.preview.ok ? (
            <>
              <Summary
                languageCount={languageCount}
                preview={request.preview}
                translate={translate}
              />
              {request.preview.samples.length > 0 ? (
                <div className="fr-folders-confirm__block">
                  <p className="fr-folders-confirm__label">{translate("confirmExamples")}</p>
                  <ul className="fr-folders-confirm__list" data-testid="url-samples">
                    {request.preview.samples.map((sample) => (
                      <li key={`${sample.collection}:${sample.id}:${sample.locale}`}>
                        <code>{sample.from}</code> {translate("becomes")} <code>{sample.to}</code>
                        {sample.locale !== null && languageCount > 1 ? (
                          <span className="fr-folders-muted"> ({sample.locale})</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {request.preview.redirectRowsToWrite > 0 ? (
                <div className="fr-folders-confirm__redirect">
                  <CheckboxInput
                    checked={redirects}
                    id="fr-folders-redirect-old-urls"
                    label={translate("confirmRedirectCheckbox")}
                    onToggle={() => setRedirects((current) => !current)}
                  />
                  <span className="fr-folders-muted" data-testid="redirect-count">
                    {translate("confirmRedirectEntries", {
                      count: request.preview.redirectRowsToWrite,
                    })}
                  </span>
                </div>
              ) : null}
              {request.preview.mirrorRowsToWrite > 0 && redirects ? (
                <p className="fr-folders-muted" data-testid="mirror-count">
                  {translate("confirmMirrorEntries", {
                    count: request.preview.mirrorRowsToWrite,
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <div className="fr-folders-confirm__block" role="alert">
              <p className="fr-folders-confirm__label">{translate("confirmBlockedHeading")}</p>
              <ul className="fr-folders-confirm__list" data-testid="blocked-list">
                {request.preview.blocked.map((block) => (
                  <li key={`${itemKeyOf(block.item)}:${block.reason}:${block.locale ?? ""}`}>
                    <strong>{titleOf(request.items, block.item)}</strong>: {block.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {request.preview.warnings.length > 0 ? (
            <div className="fr-folders-confirm__block">
              <p className="fr-folders-confirm__label">{translate("confirmWarningsHeading")}</p>
              <ul className="fr-folders-confirm__list">
                {request.preview.warnings.map((warning) => (
                  <li key={`${itemKeyOf(warning.item)}:${warning.reason}`}>
                    <strong>{titleOf(request.items, warning.item)}</strong>: {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogCancel label={translate("actionCancel")} />
        {request.preview.ok && busy ? (
          <Button disabled margin={false} size="medium">
            {request.confirmingLabel ?? translate("confirmMoving")}
          </Button>
        ) : null}
        {request.preview.ok && !busy ? (
          <DialogConfirm
            label={request.confirmLabel ?? translate("confirmMoveButton")}
            loadingLabel={request.confirmingLabel ?? translate("confirmMoving")}
            onClick={() => onConfirm(redirects)}
          />
        ) : null}
        {request.preview.blocked.some((block) => block.reason === "stale") ? (
          <Button
            margin={false}
            onClick={() => {
              closeModal(slug);
              onReload();
            }}
            size="medium"
          >
            {translate("reload")}
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
};

export const ConfirmUrlChangeDialog = ({
  request,
  slug = confirmDialogSlug,
  ...rest
}: ConfirmUrlChangeDialogProps) => (
  <DialogModal className="fr-folders-dialog" size="medium" slug={slug}>
    {request === null ? null : (
      <ConfirmContent key={request.id} request={request} slug={slug} {...rest} />
    )}
  </DialogModal>
);
