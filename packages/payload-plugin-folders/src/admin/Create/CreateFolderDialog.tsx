import {
  Button,
  DialogBody,
  DialogCancel,
  DialogFooter,
  DialogHeader,
  DialogModal,
  useModal,
} from "@payloadcms/ui";
import { useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { FolderId, TreeItem } from "../../types.js";
import { writeDocument } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import type { FolderChoice } from "../Move/FolderPickerTree.js";
import { findLoadedFolder } from "../store.js";
import type { TreeStore } from "../store.js";
import { useTreeStoreState } from "../useTreeStore.js";
import { AllowedTypesField } from "./AllowedTypesField.js";
import type { AllowedTypesValue } from "./AllowedTypesField.js";
import { ParentField } from "./ParentField.js";
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
const folderDialogFocusOptions = {
  initialFocus: () =>
    document.querySelector<HTMLElement>('[data-testid="name-input"]') ?? undefined,
};

export const createFolderDialogSlug = "fr-folders-create-folder";

export type CreateFolderDialogProps = {
  apiContext: FoldersApiContext;
  /** The slug of the folders collection. */
  foldersSlug: string;
  /** Runs once the folder exists, before the dialog closes. */
  onCreated: (created: {
    id: FolderId;
    name: string;
    parentId: FolderId | null;
  }) => Promise<void> | void;
  /** The folder the new one goes in, `null` for the top level; `undefined` while the dialog is closed. */
  parent: TreeItem | null | undefined;
  /** One per opening, so the form starts empty every time. */
  session: number;
  store: TreeStore;
  translate: Translate;
  /** Page collection slug to label, in the host's order. */
  typeLabels: Readonly<Record<string, string>>;
};

const CreateFolderContent = ({
  apiContext,
  foldersSlug,
  onCreated,
  parent: initialParent,
  store,
  translate,
  typeLabels,
}: Omit<CreateFolderDialogProps, "parent" | "session"> & {
  parent: TreeItem | null;
}): ReactNode => {
  const { closeModal } = useModal();
  const state = useTreeStoreState(store);
  const formId = useId();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<SlugState>(initialSlugState);
  const [parent, setParent] = useState<FolderChoice>({
    id: initialParent?.id ?? null,
    title: initialParent?.title ?? translate("moveToRoot"),
  });
  const [types, setTypes] = useState<AllowedTypesValue>({
    chosenTypes: [],
    defaultType: "",
    locksTypes: false,
    mode: "all",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const parentFolder = findLoadedFolder(state, parent.id);
  // The lock that reached the parent from above, else the parent's own lock (spec section 2.3).
  const lockOwnerId =
    parentFolder?.typesLockedBy ??
    (parentFolder?.lockSubfolderTypes === true ? parentFolder.id : null);
  const lockOwner = lockOwnerId === null ? null : findLoadedFolder(state, lockOwnerId);
  const isLocked = lockOwnerId !== null;
  const check = useSegmentCheck({ context: apiContext, parent: parent.id, segment: segment.value });

  const allSlugs = Object.keys(typeLabels);
  const defaultOptions = types.mode === "specific" ? types.chosenTypes : allSlugs;
  // A default that left the list (its chip was unticked) reads as no default.
  const effectiveDefault = defaultOptions.includes(types.defaultType) ? types.defaultType : "";
  const needsTypes = !isLocked && types.mode === "specific" && types.chosenTypes.length === 0;
  const canCreate = name.trim() !== "" && check.state === "ok" && !needsTypes && !isSaving;

  const changeName = (value: string) => {
    setName(value);
    setSegment((current) => slugAfterSourceChange(current, value));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }
    setIsSaving(true);
    setFailure(null);
    try {
      // Types are left out under a lock (the server hands the folder the lock's types) and when
      // they are all of them, so a server refusal never comes from a value the editor did not set.
      const { doc } = await writeDocument(apiContext, {
        body: {
          name: name.trim(),
          slug: segment.value,
          ...(parent.id === null ? {} : { parent: parent.id }),
          ...(isLocked || types.mode === "all" ? {} : { allowedTypes: types.chosenTypes }),
          ...(isLocked || effectiveDefault === "" ? {} : { defaultType: effectiveDefault }),
          ...(!isLocked && types.mode === "specific" && types.locksTypes
            ? { lockSubfolderTypes: true }
            : {}),
        },
        collection: foldersSlug,
      });
      closeModal(createFolderDialogSlug);
      await onCreated({ id: doc.id, name: name.trim(), parentId: parent.id });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      setFailure(detail === "" ? translate("createFailed") : detail);
      setIsSaving(false);
    }
  };

  return (
    <>
      <DialogHeader showClose title={translate("createFolderTitle")} />
      <DialogBody>
        <form
          className="fr-folders-form"
          data-testid="create-folder-form"
          id={formId}
          onSubmit={submit}
        >
          <div className="fr-folders-field">
            <label className="fr-folders-field__label" htmlFor={`${formId}-name`}>
              {translate("createName")}
            </label>
            <input
              autoComplete="off"
              className="fr-folders-input"
              data-testid="name-input"
              id={`${formId}-name`}
              onChange={(event) => changeName(event.target.value)}
              type="text"
              value={name}
            />
          </div>
          <SlugField
            inputId={`${formId}-segment`}
            isLinked={segment.isLinked}
            onChange={(value) => setSegment(slugAfterEdit(value))}
            onRelink={() => setSegment(slugAfterRelink(name))}
            parentPath={parentFolder?.fullPath ?? "/"}
            status={check}
            translate={translate}
            value={segment.value}
          />

          <ParentField
            apiContext={apiContext}
            choice={parent}
            foldersSlug={foldersSlug}
            onChoose={setParent}
            refusalFor={() => null}
            store={store}
            translate={translate}
          />

          <AllowedTypesField
            formId={formId}
            lock={
              isLocked
                ? { ownerTitle: lockOwner?.title ?? null, types: parentFolder?.allowedTypes ?? [] }
                : null
            }
            onChange={setTypes}
            translate={translate}
            typeLabels={typeLabels}
            value={types}
          />

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
 * The New folder dialog (spec section 7.7): name, a URL segment that follows it, the parent folder
 * with the same picker Move to... uses, and the page types. Create stays off until the name and a
 * valid, free segment exist.
 */
export const CreateFolderDialog = ({ parent, session, ...rest }: CreateFolderDialogProps) => (
  <DialogModal
    className="fr-folders-dialog"
    focusTrapOptions={folderDialogFocusOptions}
    size="medium"
    slug={createFolderDialogSlug}
  >
    {parent === undefined ? null : <CreateFolderContent key={session} parent={parent} {...rest} />}
  </DialogModal>
);
