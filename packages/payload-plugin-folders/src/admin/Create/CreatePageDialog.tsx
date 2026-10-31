import {
  Button,
  CheckboxInput,
  DialogBody,
  DialogCancel,
  DialogFooter,
  DialogHeader,
  DialogModal,
  useModal,
} from "@payloadcms/ui";
import { useEffect, useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { FolderId, TreeItem } from "../../types.js";
import { FoldersApiError, writeDocument } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import { existingRootIn } from "../ContextMenu/rootPage.js";
import type { TreeStore } from "../store.js";
import { useTreeStoreState } from "../useTreeStore.js";
import { pageTypeOptionsOf } from "./pageTypes.js";
import { SlugField } from "./SlugField.js";
import {
  initialSlugState,
  slugAfterEdit,
  slugAfterRelink,
  slugAfterSourceChange,
} from "./slugState.js";
import type { SlugState } from "./slugState.js";
import { useSegmentCheck } from "./useSegmentCheck.js";

// Payload's dialog puts the focus on its heading when it opens, which is no place to start typing:
// the first field is.
const pageDialogFocusOptions = {
  initialFocus: () =>
    document.querySelector<HTMLElement>('[data-testid="title-input"]') ?? undefined,
};

export const createPageDialogSlug = "fr-folders-create-page";

/** What a page needs to be made: the four values of spec section 7.7. */
export type NewPageValues = {
  folder: FolderId | null;
  isFolderRoot: boolean;
  slug: string;
  title: string;
};

export type CreatePageDialogProps = {
  apiContext: FoldersApiContext;
  /** Collections with drafts: only their pages are made as a draft. */
  draftCollections: readonly string[];
  /** The folder the page goes in, `null` for the top level; `undefined` while the dialog is closed. */
  folder: TreeItem | null | undefined;
  /** The page type the dialog opens with: the one the editor chose in the menu. */
  initialCollection: string;
  /** The draft exists: open its edit view. */
  onCreated: (created: { collection: string; id: FolderId; parentId: FolderId | null }) => void;
  /** The collection has no drafts or refused the draft: its drawer takes over with these values. */
  onNeedsDrawer: (request: { collection: string; values: NewPageValues }) => void;
  /** One per opening, so the form starts empty every time. */
  session: number;
  store: TreeStore;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
};

const CreatePageContent = ({
  apiContext,
  draftCollections,
  folder,
  initialCollection,
  onCreated,
  onNeedsDrawer,
  store,
  translate,
  typeLabels,
}: Omit<CreatePageDialogProps, "folder" | "session"> & { folder: TreeItem | null }): ReactNode => {
  const { closeModal } = useModal();
  const state = useTreeStoreState(store);
  const formId = useId();
  const pageTypes = pageTypeOptionsOf(folder, typeLabels);
  const [collection, setCollection] = useState(
    pageTypes.some((type) => type.collection === initialCollection)
      ? initialCollection
      : (pageTypes[0]?.collection ?? initialCollection)
  );
  const [title, setTitle] = useState("");
  const [segment, setSegment] = useState<SlugState>(initialSlugState);
  const [isRoot, setIsRoot] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // The folder's rows may not be loaded: the root page is read from them, so ask for them once.
  const folderId = folder?.id ?? null;
  const hasRootFlag = folder?.hasRootPage === true;
  const isFolderLoaded =
    state.childrenByFolder[folderId === null ? "root" : String(folderId)] !== undefined;
  useEffect(() => {
    if (hasRootFlag && !isFolderLoaded) {
      void store.loadChildren(folderId);
    }
  }, [folderId, hasRootFlag, isFolderLoaded, store]);
  const existingRoot = existingRootIn(state, folderId);

  const check = useSegmentCheck({
    context: apiContext,
    enabled: !isRoot,
    parent: folderId,
    segment: segment.value,
  });
  const canCreate =
    title.trim() !== "" && (isRoot ? segment.value !== "" : check.state === "ok") && !isSaving;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }
    const values: NewPageValues = {
      folder: folderId,
      isFolderRoot: isRoot,
      slug: segment.value,
      title: title.trim(),
    };
    // A collection without drafts has no draft to make: its own form takes the four values.
    if (!draftCollections.includes(collection)) {
      closeModal(createPageDialogSlug);
      onNeedsDrawer({ collection, values });

      return;
    }
    setIsSaving(true);
    setFailure(null);
    try {
      const { doc } = await writeDocument(apiContext, {
        body: { ...values, _status: "draft" },
        collection,
        query: { draft: "true" },
      });
      closeModal(createPageDialogSlug);
      onCreated({ collection, id: doc.id, parentId: folderId });
    } catch (error) {
      // A refused draft (a field that must be filled even for a draft, say) is finished in the
      // collection's own form; anything else is shown here and can be tried again.
      if (error instanceof FoldersApiError && error.status === 400) {
        closeModal(createPageDialogSlug);
        onNeedsDrawer({ collection, values });

        return;
      }
      const detail = error instanceof Error ? error.message : "";
      setFailure(detail === "" ? translate("createFailed") : detail);
      setIsSaving(false);
    }
  };

  return (
    <>
      <DialogHeader showClose title={translate("createPageTitle")} />
      <DialogBody>
        <form
          className="fr-folders-form"
          data-testid="create-page-form"
          id={formId}
          onSubmit={submit}
        >
          <div className="fr-folders-field">
            <label className="fr-folders-field__label" htmlFor={`${formId}-type`}>
              {translate("createPageType")}
            </label>
            <select
              className="fr-folders-input"
              data-testid="page-type"
              disabled={pageTypes.length < 2}
              id={`${formId}-type`}
              onChange={(event) => setCollection(event.target.value)}
              value={collection}
            >
              {pageTypes.map((type) => (
                <option key={type.collection} value={type.collection}>
                  {type.isDefault
                    ? `${type.label} (${translate("createDefaultBadge")})`
                    : type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="fr-folders-field">
            <label className="fr-folders-field__label" htmlFor={`${formId}-title`}>
              {translate("createTitle")}
            </label>
            <input
              autoComplete="off"
              className="fr-folders-input"
              data-testid="title-input"
              id={`${formId}-title`}
              onChange={(event) => {
                setTitle(event.target.value);
                setSegment((current) => slugAfterSourceChange(current, event.target.value));
              }}
              type="text"
              value={title}
            />
          </div>
          <SlugField
            disabled={isRoot}
            inputId={`${formId}-segment`}
            isLinked={segment.isLinked}
            onChange={(value) => setSegment(slugAfterEdit(value))}
            onRelink={() => setSegment(slugAfterRelink(title))}
            parentPath={folder?.fullPath ?? "/"}
            status={check}
            translate={translate}
            value={segment.value}
          />
          <div className="fr-folders-field" data-testid="root-field">
            <CheckboxInput
              checked={isRoot}
              id={`${formId}-root`}
              label={translate("createRootPage")}
              onToggle={() => setIsRoot((current) => !current)}
              readOnly={existingRoot !== null}
            />
            {existingRoot === null ? null : (
              <p className="fr-folders-field__hint" data-testid="root-taken">
                {existingRoot === "unknown"
                  ? translate("menuRootTakenUnknown")
                  : translate("menuRootTaken", { title: existingRoot.title })}
              </p>
            )}
          </div>
          {failure === null ? null : (
            <p className="fr-folders-error" data-testid="create-failure" role="alert">
              {failure}
            </p>
          )}
        </form>
      </DialogBody>
      <DialogFooter>
        <DialogCancel label={translate("actionCancel")} />
        <Button
          disabled={!canCreate}
          extraButtonProps={{ form: formId }}
          margin={false}
          size="medium"
          type="submit"
        >
          {translate(isSaving ? "createSubmitting" : "createSubmit")}
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * The New page dialog (spec section 7.7): the page type among the folder's allowed ones, a title,
 * a URL segment that follows it, and the root page checkbox, off with the reason where the folder
 * already has one. Create makes a draft and opens it; where that cannot be done the collection's
 * own form opens with the same values.
 */
export const CreatePageDialog = ({ folder, session, ...rest }: CreatePageDialogProps) => (
  <DialogModal
    className="fr-folders-dialog"
    focusTrapOptions={pageDialogFocusOptions}
    size="medium"
    slug={createPageDialogSlug}
  >
    {folder === undefined ? null : <CreatePageContent folder={folder} key={session} {...rest} />}
  </DialogModal>
);
