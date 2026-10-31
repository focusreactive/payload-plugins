import { Button, CheckboxInput, Drawer, ShimmerEffect, toast, useModal } from "@payloadcms/ui";
import { useEffect, useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { ConfirmMoves, FolderId, TreeItem } from "../../types.js";
import { fetchDocument, fetchLatestStatus, isDraftPendingError, writeDocument } from "../api.js";
import type { FoldersApiContext, MovePreview } from "../api.js";
import { Link, editViewUrl } from "../compat.js";
import type { Translate } from "../compat.js";
import { existingRootIn, rootChangePreviewOf } from "../ContextMenu/rootPage.js";
import { ParentField } from "../Create/ParentField.js";
import { SlugField } from "../Create/SlugField.js";
import { useSegmentCheck } from "../Create/useSegmentCheck.js";
import type { FolderChoice } from "../Move/FolderPickerTree.js";
import { refusalOf } from "../Move/folderPicker.js";
import { refusalText } from "../Move/MoveDialog.js";
import type { DropMove } from "../Move/useMoveFlow.js";
import type { TreeStore } from "../store.js";
import { useTreeStoreState } from "../useTreeStore.js";
import { folderPathOfPage } from "./folderPath.js";
import { pageBodyOf, planPageSettingsSave } from "./pageSettings.js";
import type { PageSaveStep, PageSettingsValues } from "./pageSettings.js";
import type { UnrootRequest } from "./UnrootDialog.js";
import type { Confirmations } from "./useConfirmations.js";
import { useFolderName } from "./useFolderName.js";
import { urlChangeOf } from "./urlHint.js";

export const pageSettingsDrawerSlug = "fr-folders-page-settings";

/** The page as Payload's REST route answers it at depth 0: the latest version, in the admin locale. */
type PageDocument = Record<string, unknown> & {
  _status?: string;
  folder?: FolderId | { id: FolderId } | null;
  isFolderRoot?: boolean | null;
};

export type PageFieldNames = { segmentField: string; titleField: string };

export type PageSettingsRequest = { item: TreeItem; session: number };

export type PageSettingsDrawerProps = {
  adminRoute: string;
  apiContext: FoldersApiContext;
  /** Asks for the page's own segment when the root flag is unticked; `null` when cancelled. */
  askUnroot: (request: Omit<UnrootRequest, "session">) => Promise<string | null>;
  confirmations: Confirmations;
  confirmMoves: ConfirmMoves;
  /**
   * The questions a save asks, rendered inside the drawer: a dialog outside it would sit behind it
   * (Payload stacks a dialog by the drawer depth it is rendered at).
   */
  dialogs: ReactNode;
  /** Page collections with drafts: title and segment are a draft edit there. */
  draftCollections: readonly string[];
  enforceAllowedTypes: boolean;
  foldersSlug: string;
  locale: string | null;
  /** Moves the page to its new parent with the move's own preview, confirmation and Undo. */
  onMove: (move: DropMove) => Promise<void>;
  pageFields: Readonly<Record<string, PageFieldNames>>;
  request: PageSettingsRequest | null;
  store: TreeStore;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
};

type FormProps = Omit<PageSettingsDrawerProps, "dialogs" | "request"> & {
  document: PageDocument;
  item: TreeItem;
};

const textOf = (value: unknown): string => (typeof value === "string" ? value : "");

const idOf = (value: FolderId | { id: FolderId } | null | undefined): FolderId | null =>
  value === null || value === undefined ? null : typeof value === "object" ? value.id : value;

const PageSettingsForm = ({
  adminRoute,
  apiContext,
  askUnroot,
  confirmations,
  document: page,
  draftCollections,
  enforceAllowedTypes,
  foldersSlug,
  item,
  locale,
  onMove,
  pageFields,
  store,
  translate,
  typeLabels,
}: FormProps): ReactNode => {
  const { closeModal } = useModal();
  const state = useTreeStoreState(store);
  const formId = useId();
  const names = pageFields[item.collection] ?? { segmentField: "slug", titleField: "title" };
  const hasDrafts = draftCollections.includes(item.collection);

  const storedParentId = idOf(page.folder);
  const stored: PageSettingsValues = {
    isFolderRoot: Boolean(page.isFolderRoot),
    parentId: storedParentId,
    segment: textOf(page[names.segmentField]),
    title: textOf(page[names.titleField]),
  };

  const [title, setTitle] = useState(stored.title);
  const [segment, setSegment] = useState(stored.segment);
  const [isRoot, setIsRoot] = useState(stored.isFolderRoot);
  const [parent, setParent] = useState<FolderChoice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState<{ canSaveAsDraft: boolean; message: string } | null>(null);

  const parentName = useFolderName({
    apiContext,
    foldersSlug,
    id: storedParentId,
    locale,
    state,
  });
  const choice: FolderChoice = parent ?? {
    id: storedParentId,
    title: storedParentId === null ? translate("moveToRoot") : (parentName ?? "..."),
  };
  const folderPath = folderPathOfPage(item, state);
  // Another page that is the folder's root page keeps this one from taking the place.
  const existingRoot = existingRootIn(state, storedParentId, item);
  const isRootBlocked = !stored.isFolderRoot && existingRoot !== null;

  // A root page's segment is not part of its URL, so it is not checked while the page is root.
  const segmentCheck = useSegmentCheck({
    context: apiContext,
    enabled: !isRoot && segment !== stored.segment,
    exclude: { collection: item.collection, id: item.id },
    locale,
    parent: storedParentId,
    segment,
  });
  const isSegmentOk = isRoot || segment === stored.segment || segmentCheck.state === "ok";
  const canSave = title.trim() !== "" && (isRoot || segment !== "") && isSegmentOk && !isSaving;

  const edited: PageSettingsValues = {
    isFolderRoot: isRoot,
    parentId: choice.id,
    segment,
    title: title.trim(),
  };
  const urlChange = urlChangeOf(
    { folderPath, isFolderRoot: stored.isFolderRoot, segment: item.slug ?? stored.segment },
    { folderPath, isFolderRoot: isRoot, segment: segment === "" ? (item.slug ?? "") : segment }
  );

  const refusalFor = (target: TreeItem | null): string | null => {
    const refusal = refusalOf([item], target, { enforceAllowedTypes, typeLabels });

    return refusal === null ? null : refusalText(refusal, translate);
  };

  const toggleRoot = async () => {
    if (!isRoot) {
      if (!isRootBlocked) {
        setIsRoot(true);
      }

      return;
    }
    // Unticking never just unticks: the page needs a segment of its own (spec section 4).
    const chosen = await askUnroot({
      collection: item.collection,
      folderId: storedParentId,
      folderPath,
      id: item.id,
      locale,
      storedSlug: stored.segment === "" ? (item.slug ?? null) : stored.segment,
      title: title.trim() === "" ? item.title : title.trim(),
      willGoLive: hasDrafts ? !(page._status === "draft") : true,
    });
    if (chosen !== null) {
      setSegment(chosen);
      setIsRoot(false);
    }
  };

  const runContentStep = async (
    step: Extract<PageSaveStep, { kind: "content" }>
  ): Promise<boolean> => {
    if (step.needsConfirm) {
      const isNewRoot = step.changes.isFolderRoot === true;
      const preview: MovePreview = isNewRoot
        ? rootChangePreviewOf(item, folderPath, storedParentId)
        : {
            ...rootChangePreviewOf(item, folderPath, storedParentId),
            samples: [
              {
                collection: item.collection,
                from: urlChange?.from ?? item.fullPath,
                id: item.id,
                locale: null,
                to: urlChange?.to ?? item.fullPath,
              },
            ],
          };
      const isConfirmed = await confirmations.askUrlChange({
        confirmingLabel: translate("rootConfirming"),
        confirmLabel: translate(isNewRoot ? "menuSetAsRoot" : "settingsSave"),
        items: [item],
        preview,
        targetTitle: folderPath,
        title: isNewRoot
          ? translate("rootConfirmTitle", { path: folderPath, title: item.title })
          : translate("settingsLiveConfirmTitle", { title: item.title }),
      });
      if (!isConfirmed) {
        return false;
      }
    }
    await writeDocument(apiContext, {
      body: pageBodyOf({ ...names, changes: step.changes, hasDrafts, mode: step.mode }),
      collection: item.collection,
      id: item.id,
      query: step.mode === "draft" ? { draft: "true", locale } : { locale },
    });

    return true;
  };

  const save = async (event: FormEvent | null, forceDraft = false) => {
    event?.preventDefault();
    if (!canSave) {
      return;
    }
    setIsSaving(true);
    setFailure(null);
    try {
      // The page's status was read when the drawer opened; a draft saved since would be published
      // by a live save of the root flag, so it is read again right before.
      let hasNewerDraft = page._status === "draft" || forceDraft;
      if (hasDrafts && !hasNewerDraft) {
        hasNewerDraft = (await fetchLatestStatus(apiContext, item))._status === "draft";
      }
      const steps = planPageSettingsSave({ edited, hasDrafts, hasNewerDraft, stored });
      let moveStep: Extract<PageSaveStep, { kind: "move" }> | null = null;
      let wroteContent = false;
      let wasDraftEdit = false;
      for (const step of steps) {
        if (step.kind === "move") {
          moveStep = step;
          continue;
        }
        if (!(await runContentStep(step))) {
          return;
        }
        wroteContent = true;
        wasDraftEdit = step.mode === "draft";
      }
      if (wroteContent) {
        await store.invalidate([item.parentId]);
        toast.success(
          wasDraftEdit && urlChange !== null
            ? translate("settingsSavedDraftUrl", { from: urlChange.from, to: urlChange.to })
            : translate(wasDraftEdit ? "settingsSavedDraft" : "settingsSaved", {
                title: item.title,
              })
        );
      }
      closeModal(pageSettingsDrawerSlug);
      if (moveStep !== null) {
        await onMove({
          items: [item],
          selection: null,
          target: { position: "start", toFolder: moveStep.toFolder },
          targetTitle: choice.title,
        });
      }
    } catch (error) {
      setFailure({
        canSaveAsDraft: hasDrafts && isDraftPendingError(error),
        message:
          error instanceof Error && error.message !== ""
            ? error.message
            : translate("settingsFailed"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hintKey = hasDrafts ? "settingsUrlHint" : "settingsUrlHintLive";

  return (
    <form
      className="fr-folders-form fr-folders-settings"
      data-testid="page-settings-form"
      id={formId}
      onSubmit={(event) => void save(event)}
    >
      <div className="fr-folders-field">
        <label className="fr-folders-field__label" htmlFor={`${formId}-title`}>
          {translate("createTitle")}
        </label>
        <input
          autoComplete="off"
          className="fr-folders-input"
          data-testid="title-input"
          id={`${formId}-title`}
          onChange={(event) => setTitle(event.target.value)}
          type="text"
          value={title}
        />
      </div>
      <SlugField
        disabled={isRoot}
        inputId={`${formId}-segment`}
        isLinked={false}
        linkable={false}
        onChange={setSegment}
        onRelink={() => undefined}
        parentPath={folderPath}
        status={segmentCheck}
        translate={translate}
        value={segment}
      />
      {isRoot ? (
        <p className="fr-folders-field__hint" data-testid="root-url">
          {translate("settingsRootUrl", { path: folderPath })}
        </p>
      ) : null}
      {urlChange === null || isRoot !== stored.isFolderRoot ? null : (
        <p className="fr-folders-field__hint" data-testid="url-hint">
          {translate(hintKey, { from: urlChange.from, to: urlChange.to })}
        </p>
      )}
      <div className="fr-folders-field" data-testid="root-field">
        <CheckboxInput
          checked={isRoot}
          id={`${formId}-root`}
          label={translate("createRootPage")}
          onToggle={() => void toggleRoot()}
          readOnly={isRootBlocked}
        />
        {isRootBlocked ? (
          <p className="fr-folders-field__hint" data-testid="root-taken">
            {existingRoot === "unknown"
              ? translate("menuRootTakenUnknown")
              : translate("menuRootTaken", { title: existingRoot.title })}
          </p>
        ) : null}
      </div>
      <ParentField
        apiContext={apiContext}
        choice={choice}
        foldersSlug={foldersSlug}
        onChoose={setParent}
        refusalFor={refusalFor}
        store={store}
        translate={translate}
      />
      <p>
        <Link
          data-testid="open-full-editor"
          href={editViewUrl(adminRoute, item.collection, item.id)}
        >
          {translate("settingsOpenEditor")}
        </Link>
      </p>
      {failure === null ? null : (
        <div className="fr-folders-error" data-testid="settings-failure" role="alert">
          <p>{failure.message}</p>
          {failure.canSaveAsDraft ? (
            <Button
              buttonStyle="secondary"
              extraButtonProps={{ "data-testid": "save-as-draft-instead" }}
              margin={false}
              onClick={() => void save(null, true)}
              size="medium"
            >
              {translate("saveAsDraftInstead")}
            </Button>
          ) : null}
        </div>
      )}
      <div className="fr-folders-settings__actions">
        <Button
          buttonStyle="secondary"
          margin={false}
          onClick={() => closeModal(pageSettingsDrawerSlug)}
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

type Loaded = { document: PageDocument; key: string } | { error: string; key: string };

const PageSettingsContent = ({
  item,
  session,
  ...rest
}: Omit<PageSettingsDrawerProps, "dialogs" | "request"> & {
  item: TreeItem;
  session: number;
}): ReactNode => {
  const { apiContext, locale, translate } = rest;
  const key = `${session}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const read = async () => {
      try {
        const document = await fetchDocument<PageDocument>(apiContext, {
          collection: item.collection,
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
  }, [apiContext, item.collection, item.id, key, locale]);

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

  return <PageSettingsForm document={current.document} item={item} {...rest} />;
};

/**
 * Page settings (spec section 7.8, Storyblok's story Settings): title, URL segment, folder root
 * page and parent folder. Title and segment are a draft edit where the collection has drafts, with
 * the hint of the URL change; the root flag follows Set as root page; a new parent is a move.
 */
export const PageSettingsDrawer = ({ dialogs, request, ...rest }: PageSettingsDrawerProps) => (
  <Drawer
    className="fr-folders-settings-drawer"
    slug={pageSettingsDrawerSlug}
    title={
      request === null ? "" : rest.translate("settingsPageTitle", { title: request.item.title })
    }
  >
    {request === null ? null : (
      <PageSettingsContent
        item={request.item}
        key={request.session}
        session={request.session}
        {...rest}
      />
    )}
    {dialogs}
  </Drawer>
);
