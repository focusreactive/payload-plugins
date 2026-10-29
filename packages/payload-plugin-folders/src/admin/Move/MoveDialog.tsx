import {
  Button,
  ChevronIcon,
  DialogBody,
  DialogCancel,
  DialogFooter,
  DialogHeader,
  DialogModal,
  FolderIcon,
  ShimmerEffect,
} from "@payloadcms/ui";
import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";

import type { FolderId, TreeItem } from "../../types.js";
import { fetchSearch, previewMove } from "../api.js";
import type { FoldersApiContext, MovePreview } from "../api.js";
import type { Translate } from "../compat.js";
import { ReasonTooltip } from "../ReasonTooltip.js";
import { rootKey } from "../store.js";
import type { FolderKey, TreeStore } from "../store.js";
import { useTreeStoreState } from "../useTreeStore.js";
import { pickerRowsOf, refusalOf } from "./folderPicker.js";
import type { PickerRow, TargetRefusal } from "./folderPicker.js";
import { buildMoveBody } from "./moveFlow.js";
import type { MoveTarget } from "./moveFlow.js";

export const moveDialogSlug = "fr-folders-move-to";

/** What the picker hands back when the editor presses Move. */
export type MoveChoice = {
  preview: MovePreview;
  target: MoveTarget;
  targetTitle: string;
};

export type MoveDialogProps = {
  context: FoldersApiContext;
  enforceAllowedTypes: boolean;
  /** The rows to move, nested ones already left out. `null` while the dialog is closed. */
  items: readonly TreeItem[] | null;
  onChoose: (choice: MoveChoice) => void;
  /** One per opening, so the picker starts empty every time. */
  session: number;
  store: TreeStore;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
};

type PreviewState =
  | { status: "error"; message: string }
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; preview: MovePreview };

type Choice = { id: FolderId | null; title: string };

const searchDelayMs = 250;

const refusalText = (refusal: TargetRefusal, translate: Translate): string =>
  refusal.kind === "cycle"
    ? translate("moveToCycle")
    : translate("moveToType", { path: refusal.path, types: refusal.types.join(", ") });

type TargetRowProps = {
  chevron?: { expanded: boolean; onToggle: () => void; title: string; visible: boolean };
  isSelected: boolean;
  level: number;
  onSelect: () => void;
  refusal: string | null;
  secondary?: string;
  testId: string;
  title: string;
};

const TargetRow = ({
  chevron,
  isSelected,
  level,
  onSelect,
  refusal,
  secondary,
  testId,
  title,
}: TargetRowProps) => {
  const select = () => {
    if (refusal === null) {
      onSelect();
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select();
    }
    // The tree keys: Right opens a closed folder, Left closes an open one. A folder that cannot
    // take the selection still opens, because the folders inside it have their own answers.
    if (chevron?.visible && event.key === "ArrowRight" && !chevron.expanded) {
      event.preventDefault();
      chevron.onToggle();
    }
    if (chevron?.visible && event.key === "ArrowLeft" && chevron.expanded) {
      event.preventDefault();
      chevron.onToggle();
    }
  };

  return (
    <ReasonTooltip reason={refusal} position="top">
      <div
        aria-disabled={refusal === null ? undefined : true}
        aria-expanded={chevron?.visible ? chevron.expanded : undefined}
        aria-level={level + 1}
        aria-selected={isSelected}
        className={[
          "fr-folders-picker__row",
          isSelected ? "fr-folders-picker__row--selected" : "",
          refusal === null ? "" : "fr-folders-picker__row--disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        data-testid={testId}
        data-title={title}
        onClick={select}
        onKeyDown={handleKeyDown}
        role="treeitem"
        style={{ paddingInlineStart: `calc(var(--spacer-1) + ${level * 16}px)` }}
        tabIndex={0}
      >
        {chevron?.visible ? (
          <button
            aria-label={chevron.title}
            className="fr-folders-chevron"
            data-testid="picker-expand"
            onClick={(event) => {
              event.stopPropagation();
              chevron.onToggle();
            }}
            type="button"
          >
            <ChevronIcon direction={chevron.expanded ? "down" : "right"} size={16} />
          </button>
        ) : (
          <span aria-hidden="true" className="fr-folders-chevron fr-folders-chevron--empty" />
        )}
        <span aria-hidden="true" className="fr-folders-kind-icon">
          <FolderIcon size={16} />
        </span>
        <span className="fr-folders-picker__title">{title}</span>
        {secondary ? (
          <span className="fr-folders-muted fr-folders-picker__path">{secondary}</span>
        ) : null}
        {refusal === null ? null : <span className="fr-folders-visually-hidden">{refusal}</span>}
      </div>
    </ReasonTooltip>
  );
};

const PreviewLine = ({ state, translate }: { state: PreviewState; translate: Translate }) => {
  if (state.status === "idle") {
    return <p className="fr-folders-muted">{translate("moveToPreviewIdle")}</p>;
  }
  if (state.status === "loading") {
    return <p className="fr-folders-muted">{translate("moveToPreviewLoading")}</p>;
  }
  if (state.status === "error") {
    return (
      <p className="fr-folders-error" role="alert">
        {translate("moveToPreviewError")}
        {state.message === "" ? "" : `: ${state.message}`}
      </p>
    );
  }
  const { preview } = state;
  if (!preview.ok) {
    return (
      <p className="fr-folders-error" role="alert">
        {preview.blocked[0]?.message ?? translate("moveToPreviewError")}
      </p>
    );
  }

  return (
    <p data-testid="move-preview-line">
      {preview.urlChanges.published > 0
        ? translate("moveToUrlsWillChange", { count: preview.urlChanges.published })
        : translate("moveToUrlsNoChange")}
    </p>
  );
};

type PickerProps = Omit<MoveDialogProps, "items" | "session"> & { items: readonly TreeItem[] };

const MoveDialogContent = ({
  context,
  enforceAllowedTypes,
  items,
  onChoose,
  store,
  translate,
  typeLabels,
}: PickerProps) => {
  const state = useTreeStoreState(store);
  const [expanded, setExpanded] = useState<ReadonlySet<FolderKey>>(() => new Set());
  const [choice, setChoice] = useState<Choice | null>(null);
  const [position, setPosition] = useState<MoveTarget["position"]>("start");
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "idle" });
  const [searchText, setSearchText] = useState("");
  const [searchHits, setSearchHits] = useState<{
    items: TreeItem[];
    status: "idle" | "loading" | "ready";
  }>({ items: [], status: "idle" });

  // The shared store already has the top level when the tree is behind the dialog; this reads it
  // again when it is stale and covers the dialog being opened before the tree has loaded.
  useEffect(() => {
    void store.loadChildren(null);
  }, [store]);

  const rows = useMemo(
    () => pickerRowsOf(state, expanded, translate("moveToRoot")),
    [state, expanded, translate]
  );

  const foldersCollection = useMemo(() => {
    for (const entry of Object.values(state.childrenByFolder)) {
      const folder = entry.items.find((item) => item.kind === "folder");
      if (folder) {
        return folder.collection;
      }
    }

    return null;
  }, [state.childrenByFolder]);

  const toggleFolder = (key: FolderKey) => {
    const opening = !expanded.has(key);
    setExpanded((current) => {
      const next = new Set(current);
      if (opening) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
    if (opening) {
      void store.loadChildren(key);
    }
  };

  // Searches the folders, everywhere, once the editor stops typing.
  useEffect(() => {
    const text = searchText.trim();
    if (text === "" || foldersCollection === null) {
      setSearchHits({ items: [], status: "idle" });

      return undefined;
    }
    setSearchHits((current) => ({ ...current, status: "loading" }));
    const controller = new AbortController();
    const search = async () => {
      try {
        const response = await fetchSearch(
          context,
          {
            folder: null,
            locale: store.getOptions()?.locale ?? null,
            query: text,
            scope: "all",
            types: [foldersCollection],
          },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setSearchHits({ items: response.items, status: "ready" });
        }
      } catch {
        if (!controller.signal.aborted) {
          setSearchHits({ items: [], status: "ready" });
        }
      }
    };
    const timer = setTimeout(() => void search(), searchDelayMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [context, foldersCollection, searchText, store]);

  // The live line under the tree: what moving to the chosen folder would do, read from the
  // server's preview so it is the same answer the move will check again.
  useEffect(() => {
    if (choice === null) {
      setPreviewState({ status: "idle" });

      return undefined;
    }
    const controller = new AbortController();
    setPreviewState({ status: "loading" });
    const readPreview = async () => {
      try {
        const preview = await previewMove(
          context,
          buildMoveBody(items, { position, toFolder: choice.id }),
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
    void readPreview();

    return () => controller.abort();
  }, [choice, context, items, position]);

  const refusalFor = (target: TreeItem | null): string | null => {
    const refusal = refusalOf(items, target, { enforceAllowedTypes, typeLabels });

    return refusal === null ? null : refusalText(refusal, translate);
  };

  // A refused move can still be pressed: the confirmation then lists the reasons.
  const canMove = previewState.status === "ready" && choice !== null;
  const searching = searchText.trim() !== "";

  return (
    <>
      <DialogHeader showClose title={translate("moveToTitle", { count: items.length })} />
      <DialogBody>
        <div className="fr-folders-picker">
          <input
            aria-label={translate("moveToSearchLabel")}
            className="fr-folders-picker__search"
            data-testid="picker-search"
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={translate("moveToSearchPlaceholder")}
            type="search"
            value={searchText}
          />
          <div
            aria-label={translate("moveToTreeLabel")}
            className="fr-folders-picker__tree"
            data-testid="picker-tree"
            role="tree"
          >
            {searching ? (
              <>
                {searchHits.status === "loading" ? (
                  <div aria-label={translate("moveToSearching")} aria-busy="true" role="status">
                    <ShimmerEffect height="14px" width="40%" />
                  </div>
                ) : null}
                {searchHits.status === "ready" && searchHits.items.length === 0 ? (
                  <p className="fr-folders-muted fr-folders-picker__note">
                    {translate("moveToNoResults", { query: searchText.trim() })}
                  </p>
                ) : null}
                {searchHits.items.map((hit) => (
                  <TargetRow
                    isSelected={
                      choice !== null && choice.id !== null && String(choice.id) === String(hit.id)
                    }
                    key={`${hit.collection}:${hit.id}`}
                    level={0}
                    onSelect={() => setChoice({ id: hit.id, title: hit.title })}
                    refusal={refusalFor(hit)}
                    secondary={hit.fullPath}
                    testId="picker-row"
                    title={hit.title}
                  />
                ))}
              </>
            ) : (
              rows.map((row: PickerRow) => {
                switch (row.kind) {
                  case "folder": {
                    const isRoot = row.item === null;

                    return (
                      <TargetRow
                        chevron={
                          isRoot
                            ? undefined
                            : {
                                expanded: row.expanded,
                                onToggle: () => toggleFolder(String(row.id)),
                                title: translate(row.expanded ? "collapse" : "expand", {
                                  name: row.title,
                                }),
                                visible: row.expandable,
                              }
                        }
                        isSelected={
                          choice !== null &&
                          (isRoot
                            ? choice.id === null
                            : choice.id !== null && String(choice.id) === String(row.id))
                        }
                        key={row.key}
                        level={row.level}
                        onSelect={() => setChoice({ id: row.id, title: row.title })}
                        refusal={isRoot ? null : refusalFor(row.item)}
                        testId={isRoot ? "picker-root" : "picker-row"}
                        title={row.title}
                      />
                    );
                  }
                  case "loading": {
                    return (
                      <div
                        aria-busy="true"
                        className="fr-folders-picker__note"
                        key={row.key}
                        role="status"
                        style={{
                          paddingInlineStart: `calc(var(--spacer-1) + ${row.level * 16}px)`,
                        }}
                      >
                        <ShimmerEffect height="14px" width="40%" />
                      </div>
                    );
                  }
                  case "empty": {
                    return (
                      <p
                        className="fr-folders-muted fr-folders-picker__note"
                        key={row.key}
                        style={{
                          paddingInlineStart: `calc(var(--spacer-5) + ${row.level * 16}px)`,
                        }}
                      >
                        {translate("moveToEmptyFolder")}
                      </p>
                    );
                  }
                  case "load-more": {
                    return (
                      <div
                        className="fr-folders-picker__note"
                        key={row.key}
                        style={{
                          paddingInlineStart: `calc(var(--spacer-5) + ${row.level * 16}px)`,
                        }}
                      >
                        <Button
                          buttonStyle="secondary"
                          disabled={row.loading}
                          margin={false}
                          onClick={() =>
                            void store.loadMore(row.parentKey === rootKey ? null : row.parentKey)
                          }
                          size="medium"
                        >
                          {row.loading
                            ? translate("loadingMore")
                            : translate("loadMore", { count: store.getOptions()?.pageSize ?? 100 })}
                        </Button>
                      </div>
                    );
                  }
                  default: {
                    return (
                      <div className="fr-folders-picker__note" key={row.key}>
                        <span className="fr-folders-error" role="alert">
                          {translate("loadError")}
                        </span>
                        <Button
                          buttonStyle="secondary"
                          margin={false}
                          onClick={() =>
                            void store.loadChildren(
                              row.parentKey === rootKey ? null : row.parentKey
                            )
                          }
                          size="medium"
                        >
                          {translate("retry")}
                        </Button>
                      </div>
                    );
                  }
                }
              })
            )}
          </div>
          <fieldset className="fr-folders-picker__position">
            <legend>{translate("moveToPositionLabel")}</legend>
            <label>
              <input
                checked={position === "start"}
                name="fr-folders-move-position"
                onChange={() => setPosition("start")}
                type="radio"
              />
              {translate("moveToPositionTop")}
            </label>
            <label>
              <input
                checked={position === "end"}
                name="fr-folders-move-position"
                onChange={() => setPosition("end")}
                type="radio"
              />
              {translate("moveToPositionBottom")}
            </label>
          </fieldset>
          <div aria-live="polite" className="fr-folders-picker__preview" role="status">
            <PreviewLine state={previewState} translate={translate} />
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogCancel label={translate("actionCancel")} />
        <Button
          disabled={!canMove}
          margin={false}
          onClick={() => {
            if (canMove && choice !== null && previewState.status === "ready") {
              onChoose({
                preview: previewState.preview,
                target: { position, toFolder: choice.id },
                targetTitle: choice.title,
              });
            }
          }}
          size="medium"
        >
          {translate("confirmMoveButton")}
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * The "Move to..." dialog of spec section 7.9: a folder picker on the shared store, the folders a
 * selection cannot go into greyed with the reason, top or bottom, and the live preview line.
 * Pressing Move hands the choice back; whether a confirmation follows is the caller's.
 */
export const MoveDialog = ({ items, session, ...rest }: MoveDialogProps) => (
  <DialogModal className="fr-folders-dialog" size="medium" slug={moveDialogSlug}>
    {items === null ? null : <MoveDialogContent items={items} key={session} {...rest} />}
  </DialogModal>
);
