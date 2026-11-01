import {
  Button,
  DialogBody,
  DialogCancel,
  DialogFooter,
  DialogHeader,
  DialogModal,
} from "@payloadcms/ui";
import { useId, useState } from "react";
import type { FormEvent } from "react";

import { slugify } from "../../core/slugify.js";
import type { TreeItem } from "../../types.js";
import { postDuplicate } from "../api.js";
import type { DuplicateResult, FoldersApiContext } from "../api.js";
import { useContentLocales } from "../compat.js";
import type { Translate } from "../compat.js";
import { ParentField } from "../Create/ParentField.js";
import { SlugField } from "../Create/SlugField.js";
import { slugAfterEdit, slugAfterRelink, slugAfterSourceChange } from "../Create/slugState.js";
import type { SlugState } from "../Create/slugState.js";
import { useCreateSegmentCheck } from "../Create/useCreateSegmentCheck.js";
import type { FolderChoice } from "../Move/FolderPickerTree.js";
import { refusalOf } from "../Move/folderPicker.js";
import { refusalText } from "../Move/MoveDialog.js";
import { findLoadedFolder } from "../store.js";
import type { TreeStore } from "../store.js";
import { useTreeStoreState } from "../useTreeStore.js";
import { duplicateRefusalOf, rootsOf } from "./operationLogic.js";

export const duplicateDialogSlug = "fr-folders-duplicate";

export type DuplicateDialogProps = {
  context: FoldersApiContext;
  /** The slug of the folders collection. */
  foldersSlug: string;
  /** The rows to copy. `null` while the dialog is closed. */
  items: readonly TreeItem[] | null;
  /** The admin locale: a single copy's name and segment are written in it. */
  locale: string | null;
  /** The copy went through (made at once, or stored as an operation to step). */
  onDuplicated: (result: DuplicateResult, target: FolderChoice) => void;
  /** One per opening, so the form starts at its defaults every time. */
  session: number;
  store: TreeStore;
  translate: Translate;
  /** Page collection slug to label, in the host's order. */
  typeLabels: Readonly<Record<string, string>>;
};

// The name is what the editor changes first, so it gets the focus instead of the dialog's heading.
const duplicateFocusOptions = {
  initialFocus: () =>
    document.querySelector<HTMLElement>('[data-testid="duplicate-name-input"]') ?? undefined,
};

const DuplicateContent = ({
  context,
  foldersSlug,
  items,
  locale,
  onDuplicated,
  store,
  translate,
  typeLabels,
}: Omit<DuplicateDialogProps, "items" | "session"> & { items: readonly TreeItem[] }) => {
  const formId = useId();
  const state = useTreeStoreState(store);
  const roots = rootsOf(items);
  const [only] = roots;
  const isSingle = roots.length === 1;
  const sourceFolder = findLoadedFolder(state, only.parentId);
  const [target, setTarget] = useState<FolderChoice>({
    id: only.parentId,
    title: sourceFolder?.title ?? translate("moveToRoot"),
  });
  const [name, setName] = useState(() =>
    isSingle ? translate("duplicateCopyName", { title: only.title }) : ""
  );
  const [segment, setSegment] = useState<SlugState>(() => ({
    isLinked: false,
    value: isSingle ? `${only.slug ?? slugify(only.title)}-copy` : "",
  }));
  const [isCopying, setIsCopying] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const locales = useContentLocales();
  const targetFolder = findLoadedFolder(state, target.id);
  const check = useCreateSegmentCheck({
    context,
    enabled: isSingle,
    locales,
    parent: target.id,
    segment: segment.value,
  });
  const refusal = duplicateRefusalOf(roots, target.id);
  const hasFolder = roots.some((root) => root.kind === "folder");
  const canCopy =
    refusal === null && !isCopying && (!isSingle || (name.trim() !== "" && check.state === "ok"));

  const refusalFor = (candidate: TreeItem | null): string | null => {
    // Where a copy may go: the page types of the folder. Copying a folder into itself is fine,
    // because the copy is made from what exists before it starts.
    const reason = refusalOf(roots, candidate, { enforceAllowedTypes: true, typeLabels });

    return reason === null || reason.kind === "cycle" ? null : refusalText(reason, translate);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCopy) {
      return;
    }
    setIsCopying(true);
    setFailure(null);
    try {
      const result = await postDuplicate(context, {
        items: roots.map(({ collection, id }) => ({ collection, id })),
        locale,
        ...(isSingle ? { overrides: { name: name.trim(), slug: segment.value } } : {}),
        toFolder: target.id,
      });
      onDuplicated(result, target);
    } catch (error) {
      setFailure(
        error instanceof Error && error.message !== ""
          ? error.message
          : translate("duplicateFailed")
      );
      setIsCopying(false);
    }
  };

  return (
    <>
      <DialogHeader
        showClose
        title={
          isSingle
            ? translate("duplicateTitleOne", { title: only.title })
            : translate("duplicateTitleMany", { count: roots.length })
        }
      />
      <DialogBody>
        <form
          className="fr-folders-form"
          data-testid="duplicate-dialog"
          id={formId}
          onSubmit={submit}
        >
          {isSingle ? (
            <>
              <div className="fr-folders-field">
                <label className="fr-folders-field__label" htmlFor={`${formId}-name`}>
                  {translate("createName")}
                </label>
                <input
                  autoComplete="off"
                  className="fr-folders-input"
                  data-testid="duplicate-name-input"
                  id={`${formId}-name`}
                  onChange={(event) => {
                    setName(event.target.value);
                    setSegment((current) => slugAfterSourceChange(current, event.target.value));
                  }}
                  type="text"
                  value={name}
                />
              </div>
              <SlugField
                inputId={`${formId}-segment`}
                isLinked={segment.isLinked}
                onChange={(value) => setSegment(slugAfterEdit(value))}
                onRelink={() => setSegment(slugAfterRelink(name))}
                parentPath={targetFolder?.fullPath ?? "/"}
                status={check}
                translate={translate}
                value={segment.value}
              />
            </>
          ) : null}
          <ParentField
            apiContext={context}
            choice={target}
            foldersSlug={foldersSlug}
            labelKey="duplicateTarget"
            onChoose={setTarget}
            refusalFor={refusalFor}
            store={store}
            translate={translate}
          />
          {refusal === null ? null : (
            <p className="fr-folders-error" data-testid="duplicate-refusal" role="alert">
              {translate("duplicateSameFolder")}
            </p>
          )}
          <p className="fr-folders-muted" data-testid="duplicate-note">
            {hasFolder ? translate("duplicateNoteFolder") : translate("duplicateNote")}
          </p>
          {failure === null ? null : (
            <p className="fr-folders-error" data-testid="duplicate-failure" role="alert">
              {failure}
            </p>
          )}
        </form>
      </DialogBody>
      <DialogFooter>
        <DialogCancel label={translate("actionCancel")} />
        <Button
          disabled={!canCopy}
          extraButtonProps={{ form: formId }}
          margin={false}
          size="medium"
          type="submit"
        >
          {isCopying ? translate("duplicateCopying") : translate("duplicateButton")}
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * The Duplicate dialog of spec section 7.10. One item gets a name, a URL segment (the original's
 * with `-copy`) and a target folder; several get the target folder only, which must differ from the
 * folder they sit in, and the dialog says so before it sends anything. Copies are drafts, on top.
 */
export const DuplicateDialog = ({ items, session, ...rest }: DuplicateDialogProps) => (
  <DialogModal
    className="fr-folders-dialog"
    focusTrapOptions={duplicateFocusOptions}
    size="medium"
    slug={duplicateDialogSlug}
  >
    {items === null ? null : <DuplicateContent items={items} key={session} {...rest} />}
  </DialogModal>
);
