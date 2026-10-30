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
import { previewMove } from "../api.js";
import type { FoldersApiContext, MovePreview } from "../api.js";
import type { Translate } from "../compat.js";
import type { TreeStore } from "../store.js";
import { FolderPickerTree } from "./FolderPickerTree.js";
import type { FolderChoice } from "./FolderPickerTree.js";
import { refusalOf } from "./folderPicker.js";
import type { TargetRefusal } from "./folderPicker.js";
import { buildMoveBody } from "./moveFlow.js";
import type { InsideTarget, MoveTarget } from "./moveFlow.js";

export const moveDialogSlug = "fr-folders-move-to";

/** What the picker hands back when the editor presses Move. */
export type MoveChoice = {
  preview: MovePreview;
  target: MoveTarget;
  targetTitle: string;
};

export type MoveDialogProps = {
  /** A move is in flight: pressing Move would be dropped, so it waits. */
  busy: boolean;
  context: FoldersApiContext;
  enforceAllowedTypes: boolean;
  /** The slug of the folders collection, from the plugin's settings. */
  foldersSlug: string;
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

const refusalText = (refusal: TargetRefusal, translate: Translate): string =>
  refusal.kind === "cycle"
    ? translate("moveToCycle")
    : translate("moveToType", { path: refusal.path, types: refusal.types.join(", ") });

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
  busy,
  context,
  enforceAllowedTypes,
  foldersSlug,
  items,
  onChoose,
  store,
  translate,
  typeLabels,
}: PickerProps) => {
  const [choice, setChoice] = useState<FolderChoice | null>(null);
  const [position, setPosition] = useState<InsideTarget["position"]>("start");
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "idle" });
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

  return (
    <>
      <DialogHeader showClose title={translate("moveToTitle", { count: items.length })} />
      <DialogBody>
        <div className="fr-folders-picker">
          <FolderPickerTree
            choice={choice}
            context={context}
            foldersSlug={foldersSlug}
            onChoose={setChoice}
            refusalFor={refusalFor}
            store={store}
            translate={translate}
          />
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
          disabled={!canMove || busy}
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
