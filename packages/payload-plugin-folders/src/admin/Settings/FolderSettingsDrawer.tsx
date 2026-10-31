import { Button, Drawer, ShimmerEffect, useModal } from "@payloadcms/ui";
import { useEffect, useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { FolderId, TreeItem } from "../../types.js";
import { fetchDocument, fetchSubfolderCount, previewFolderEdit, writeDocument } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import { AllowedTypesField } from "../Create/AllowedTypesField.js";
import type { AllowedTypesValue } from "../Create/AllowedTypesField.js";
import { ParentField } from "../Create/ParentField.js";
import { SlugField } from "../Create/SlugField.js";
import { useSegmentCheck } from "../Create/useSegmentCheck.js";
import type { FolderChoice } from "../Move/FolderPickerTree.js";
import { refusalOf } from "../Move/folderPicker.js";
import { refusalText } from "../Move/MoveDialog.js";
import { needsConfirmation } from "../Move/moveFlow.js";
import type { ConfirmMoves } from "../../types.js";
import type { DropMove } from "../Move/useMoveFlow.js";
import type { TreeStore } from "../store.js";
import { useTreeStoreState } from "../useTreeStore.js";
import { folderPathOf } from "./folderPath.js";
import { effectiveDefaultType, planFolderSettingsSave } from "./folderSettings.js";
import type { FolderSettingsValues } from "./folderSettings.js";
import type { Confirmations } from "./useConfirmations.js";
import { useFolderName } from "./useFolderName.js";
import { UrlHistoryList } from "./UrlHistoryList.js";

export const folderSettingsDrawerSlug = "fr-folders-folder-settings";

/** The folder as Payload's REST route answers it at depth 0, in the admin locale and without fallbacks. */
type FolderDocument = {
  allowedTypes?: string[] | null;
  defaultType?: string | null;
  lockSubfolderTypes?: boolean | null;
  name?: string | null;
  parent?: FolderId | { id: FolderId } | null;
  slug?: string | null;
  typesLockedBy?: FolderId | { id: FolderId } | null;
};

const idOf = (value: FolderId | { id: FolderId } | null | undefined): FolderId | null =>
  value === null || value === undefined ? null : typeof value === "object" ? value.id : value;

export type FolderSettingsRequest = { item: TreeItem; session: number };

export type FolderSettingsDrawerProps = {
  apiContext: FoldersApiContext;
  confirmations: Confirmations;
  confirmMoves: ConfirmMoves;
  enforceAllowedTypes: boolean;
  foldersSlug: string;
  /**
   * The questions a save asks, rendered inside the drawer: a dialog outside it would sit behind it
   * (Payload stacks a dialog by the drawer depth it is rendered at).
   */
  dialogs: ReactNode;
  language: string;
  locale: string | null;
  /** Moves the folder to its new parent with the move's own preview, confirmation and Undo. */
  onMove: (move: DropMove) => Promise<void>;
  request: FolderSettingsRequest | null;
  store: TreeStore;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
};

type FormProps = Omit<FolderSettingsDrawerProps, "dialogs" | "request"> & {
  document: FolderDocument;
  item: TreeItem;
};

const FolderSettingsForm = ({
  apiContext,
  confirmations,
  confirmMoves,
  document: folder,
  enforceAllowedTypes,
  foldersSlug,
  item,
  language,
  locale,
  onMove,
  store,
  translate,
  typeLabels,
}: FormProps): ReactNode => {
  const { closeModal } = useModal();
  const state = useTreeStoreState(store);
  const formId = useId();
  const allTypes = Object.keys(typeLabels);

  const storedParentId = idOf(folder.parent);
  const lockerId = idOf(folder.typesLockedBy);
  const isLocked = lockerId !== null;
  const storedTypes = folder.allowedTypes ?? [];
  const stored: FolderSettingsValues = {
    allowedTypes: storedTypes,
    defaultType: folder.defaultType ?? "",
    lockSubfolderTypes: Boolean(folder.lockSubfolderTypes),
    name: folder.name ?? "",
    parentId: storedParentId,
    segment: folder.slug ?? "",
  };

  const [name, setName] = useState(stored.name);
  const [segment, setSegment] = useState(stored.segment);
  const [parent, setParent] = useState<FolderChoice | null>(null);
  const [types, setTypes] = useState<AllowedTypesValue>({
    chosenTypes: storedTypes,
    defaultType: stored.defaultType,
    locksTypes: stored.lockSubfolderTypes,
    mode: storedTypes.length > 0 ? "specific" : "all",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const parentName = useFolderName({
    apiContext,
    foldersSlug,
    id: storedParentId,
    locale,
    state,
  });
  const lockerName = useFolderName({ apiContext, foldersSlug, id: lockerId, locale, state });
  const choice: FolderChoice = parent ?? {
    id: storedParentId,
    title: storedParentId === null ? translate("moveToRoot") : (parentName ?? "..."),
  };

  const segmentCheck = useSegmentCheck({
    context: apiContext,
    enabled: segment !== stored.segment,
    exclude: { collection: foldersSlug, id: item.id },
    locale,
    parent: storedParentId,
    segment,
  });

  const edited: FolderSettingsValues = {
    allowedTypes: types.mode === "specific" ? types.chosenTypes : [],
    defaultType: effectiveDefaultType(
      types.defaultType,
      types.mode === "specific" ? types.chosenTypes : [],
      allTypes
    ),
    lockSubfolderTypes: types.mode === "specific" && types.locksTypes,
    name: name.trim(),
    parentId: choice.id,
    segment,
  };
  const needsTypes = !isLocked && types.mode === "specific" && types.chosenTypes.length === 0;
  const isSegmentOk = segment === stored.segment || segmentCheck.state === "ok";
  const canSave = edited.name !== "" && segment !== "" && isSegmentOk && !needsTypes && !isSaving;

  const refusalFor = (target: TreeItem | null): string | null => {
    const refusal = refusalOf([item], target, { enforceAllowedTypes, typeLabels });

    return refusal === null ? null : refusalText(refusal, translate);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    const plan = planFolderSettingsSave({ edited, isLocked, stored });
    setIsSaving(true);
    setFailure(null);
    try {
      if (plan.locksSubfolders) {
        const count = await fetchSubfolderCount(apiContext, { foldersSlug, id: item.id });
        if (
          count > 0 &&
          !(await confirmations.askAction({
            body: translate("lockConfirmBody", { count }),
            confirmLabel: translate("lockConfirmButton"),
            title: translate("lockConfirmTitle", { name: item.title }),
          }))
        ) {
          return;
        }
      }
      if (plan.renames) {
        const preview = await previewFolderEdit(apiContext, item.id, {
          locale,
          slug: edited.segment,
        });
        if (
          needsConfirmation(confirmMoves, preview) &&
          !(await confirmations.askUrlChange({
            confirmingLabel: translate("renameSaving"),
            confirmLabel: translate("renameConfirmButton"),
            items: [item],
            preview,
            redirectsAreAutomatic: true,
            targetTitle: item.title,
            title: translate("renameConfirmTitle", { name: item.title, segment: edited.segment }),
          }))
        ) {
          return;
        }
      }
      if (Object.keys(plan.patch).length > 0) {
        await writeDocument(apiContext, {
          body: plan.patch,
          collection: foldersSlug,
          id: item.id,
          query: { locale },
        });
        await store.invalidate([item.parentId, item.id]);
      }
      closeModal(folderSettingsDrawerSlug);
      if (plan.toParent !== null) {
        await onMove({
          items: [item],
          selection: null,
          target: { position: "start", toFolder: plan.toParent.id },
          targetTitle: choice.title,
        });
      }
    } catch (error) {
      setFailure(
        error instanceof Error && error.message !== "" ? error.message : translate("settingsFailed")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      className="fr-folders-form fr-folders-settings"
      data-testid="folder-settings-form"
      id={formId}
      onSubmit={save}
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
          onChange={(event) => setName(event.target.value)}
          type="text"
          value={name}
        />
      </div>
      <SlugField
        inputId={`${formId}-segment`}
        isLinked={false}
        linkable={false}
        onChange={setSegment}
        onRelink={() => undefined}
        parentPath={folderPathOf(state, storedParentId)}
        status={segmentCheck}
        translate={translate}
        value={segment}
      />
      <ParentField
        apiContext={apiContext}
        choice={choice}
        foldersSlug={foldersSlug}
        onChoose={setParent}
        refusalFor={refusalFor}
        store={store}
        translate={translate}
      />
      <AllowedTypesField
        formId={formId}
        lock={isLocked ? { ownerTitle: lockerName, types: storedTypes } : null}
        onChange={setTypes}
        translate={translate}
        typeLabels={typeLabels}
        value={types}
      />
      <div className="fr-folders-field">
        <span className="fr-folders-field__label">{translate("settingsFullUrl")}</span>
        <code data-testid="settings-full-url">{item.fullPath === "" ? "/" : item.fullPath}</code>
      </div>
      <UrlHistoryList
        apiContext={apiContext}
        collection={foldersSlug}
        id={item.id}
        language={language}
        translate={translate}
      />
      {failure === null ? null : (
        <p className="fr-folders-error" data-testid="settings-failure" role="alert">
          {failure}
        </p>
      )}
      <div className="fr-folders-settings__actions">
        <Button
          buttonStyle="secondary"
          margin={false}
          onClick={() => closeModal(folderSettingsDrawerSlug)}
          size="medium"
        >
          {translate("actionCancel")}
        </Button>
        <Button disabled={!canSave} margin={false} size="medium" type="submit">
          {translate(isSaving ? "settingsSaving" : "settingsSave")}
        </Button>
      </div>
    </form>
  );
};

type Loaded = { document: FolderDocument; key: string } | { error: string; key: string };

const FolderSettingsContent = ({
  item,
  session,
  ...rest
}: Omit<FolderSettingsDrawerProps, "dialogs" | "request"> & {
  item: TreeItem;
  session: number;
}): ReactNode => {
  const { apiContext, foldersSlug, locale, translate } = rest;
  const key = `${session}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const read = async () => {
      try {
        const document = await fetchDocument<FolderDocument>(apiContext, {
          collection: foldersSlug,
          id: item.id,
          locale,
        });
        if (isCurrent) {
          setLoaded({ document, key });
        }
      } catch (error) {
        if (isCurrent) {
          setLoaded({ error: error instanceof Error ? error.message : "", key });
        }
      }
    };
    void read();

    return () => {
      isCurrent = false;
    };
  }, [apiContext, foldersSlug, item.id, key, locale]);

  const current = loaded?.key === key ? loaded : null;
  if (current === null) {
    return (
      <div aria-busy="true" aria-label={translate("loading")} role="status">
        <ShimmerEffect height="14px" width="60%" />
      </div>
    );
  }
  if ("error" in current) {
    return (
      <p className="fr-folders-error" role="alert">
        {translate("settingsLoadFailed")}
        {current.error === "" ? "" : `: ${current.error}`}
      </p>
    );
  }

  return <FolderSettingsForm document={current.document} item={item} {...rest} />;
};

/**
 * Folder settings (spec section 7.8): name, URL segment, parent folder, page types, the folder's
 * full URL and its URL history. Save sends one PATCH of what changed; a new segment is previewed
 * and confirmed first, a new parent is a move, and locking subfolder types asks with the number of
 * subfolders it rewrites.
 */
export const FolderSettingsDrawer = ({ dialogs, request, ...rest }: FolderSettingsDrawerProps) => (
  <Drawer
    className="fr-folders-settings-drawer"
    slug={folderSettingsDrawerSlug}
    title={
      request === null ? "" : rest.translate("settingsFolderTitle", { name: request.item.title })
    }
  >
    {request === null ? null : (
      <FolderSettingsContent
        item={request.item}
        key={request.session}
        session={request.session}
        {...rest}
      />
    )}
    {dialogs}
  </Drawer>
);
