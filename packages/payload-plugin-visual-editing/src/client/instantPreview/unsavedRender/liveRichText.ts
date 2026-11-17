import type { LiveRichTextField, LiveRichTextRequest } from "../../../shared/protocol.js";
import type { AdminPage } from "../adminChannel.js";
import type { SavedRichTextShapes } from "./savedShapes.js";
import type { RenderOfShape, UnsavedRenderState } from "./unsavedRender.js";

import type { SavedDocument } from "../../saveEvents.js";

import {
  documentAddressOf,
  keyedFieldAddressOf,
  veDocumentOf,
} from "../../../shared/veDocument.js";
import { listenToSaves } from "../../saveEvents.js";
import { listenToAdmin } from "../adminChannel.js";
import { isForAnotherLocale, readRichTextStructure } from "../liveMessages.js";
import { announceLiveRichText } from "./announcer.js";
import { createUnsavedRender, heldSavedOf, inPlaceOfSaved, NOTHING_TOLD } from "./unsavedRender.js";

export type RenderUnsavedRichText<Node> = (
  request: LiveRichTextRequest,
  signal: AbortSignal
) => Promise<Node | null | undefined>;

export type RenderUnsavedRichTextOnThePage<Node> = (
  request: LiveRichTextRequest
) => Node | null | PromiseLike<Node | null>;

export type LiveRichTextOptions<Node> = {
  field: LiveRichTextField;
  savedShape: string;
  shown?: UnsavedRenderState<Node>;
  adminPage: () => AdminPage;
  savedShapes: SavedRichTextShapes | null;
  render: RenderUnsavedRichText<Node>;
  optimistic?: RenderUnsavedRichTextOnThePage<Node>;
  onChange: (snapshot: UnsavedRenderState<Node>, isRender: boolean) => void;
};

export type ShownRichText<Node> = { node: Node; commit: () => void };

export interface LiveRichText<Node> {
  snapshot(): UnsavedRenderState<Node>;
  shownFor(snapshot: UnsavedRenderState<Node>, saved: RenderOfShape<Node>): ShownRichText<Node>;
  renderOnThePageAgain(): void;
  dropUnsaved(): void;
  stop(): void;
}

const commitNothing = (): void => undefined;

type SavedWithoutPageRender<Node> = { ofPage: RenderOfShape<Node>; saved: RenderOfShape<Node> };

const isSameRender = <Node>(one: RenderOfShape<Node>, other: RenderOfShape<Node>): boolean =>
  one.node === other.node && one.shape === other.shape;

export const shownWithoutLiveRichText = <Node>(
  saved: RenderOfShape<Node>
): ShownRichText<Node> => ({
  commit: commitNothing,
  node: saved.node,
});

export function createLiveRichText<Node>({
  adminPage,
  field,
  onChange,
  optimistic,
  render,
  savedShape,
  savedShapes,
  shown = NOTHING_TOLD,
}: LiveRichTextOptions<Node>): LiveRichText<Node> {
  const fieldAddress = keyedFieldAddressOf(field);
  let snapshot = shown;
  let held: RenderOfShape<Node> | null = null;
  let savedOfPage: RenderOfShape<Node> | null = null;
  let savedWithoutPageRender: SavedWithoutPageRender<Node> | null = null;
  let savedShapeAwaitingRender: string | null = null;
  let namedShape = savedShape;
  let unnameSavedShape = savedShapes?.name(fieldAddress, savedShape);

  const nameSavedShape = (shape: string) => {
    if (shape === namedShape) return;
    unnameSavedShape?.();
    namedShape = shape;
    unnameSavedShape = savedShapes?.name(fieldAddress, shape);
  };

  const savedShownFor = (ofPage: RenderOfShape<Node>): RenderOfShape<Node> =>
    savedWithoutPageRender && isSameRender(savedWithoutPageRender.ofPage, ofPage)
      ? savedWithoutPageRender.saved
      : ofPage;

  const takeRenderOfSavedShape = () => {
    const shape = savedShapeAwaitingRender;
    if (shape === null || savedOfPage === null) return;
    if (shape === savedShownFor(savedOfPage).shape) {
      savedShapeAwaitingRender = null;
      return;
    }
    if (snapshot.unsaved?.shape !== shape) return;
    savedShapeAwaitingRender = null;
    savedWithoutPageRender = { ofPage: savedOfPage, saved: snapshot.unsaved };
  };

  const unsavedRender = createUnsavedRender<Node>({
    onChange: (change, isRender) => {
      snapshot = { ...snapshot, ...change };
      takeRenderOfSavedShape();
      onChange(snapshot, isRender);
    },
    optimistic: optimistic && (({ locale, state }) => optimistic({ field, locale, state })),
    render: ({ locale, state }, signal) => render({ field, locale, state }, signal),
    savedShape,
    shown: snapshot,
  });

  const stopListening = listenToAdmin({
    adminPage,
    announce: () =>
      announceLiveRichText({ document: veDocumentOf(field), key: field.key }, adminPage()),
    onMessage: unsavedRender.tell,
    read: (data: unknown) => {
      const structure = readRichTextStructure(data);
      return structure && keyedFieldAddressOf(structure) === fieldAddress ? structure : null;
    },
  });

  const isSaveOfField = (saved: SavedDocument): boolean =>
    saved === null ||
    (documentAddressOf(saved) === documentAddressOf(field) &&
      !isForAnotherLocale(saved, adminPage().locale));

  const stopListeningToSaves = listenToSaves(
    () => adminPage().adminOrigin,
    (saved) => {
      if (!isSaveOfField(saved)) return;
      savedShapeAwaitingRender = snapshot.editorShape;
      takeRenderOfSavedShape();
      snapshot = { ...snapshot };
      onChange(snapshot, false);
    }
  );

  return {
    dropUnsaved: unsavedRender.dropUnsaved,
    renderOnThePageAgain: unsavedRender.renderOnThePageAgain,
    shownFor(shownSnapshot, savedRenderOfPage) {
      const saved = savedShownFor(savedRenderOfPage);
      const nextHeld = heldSavedOf(held ?? saved, saved, shownSnapshot.editorShape);
      return {
        commit() {
          if (savedOfPage && !isSameRender(savedOfPage, savedRenderOfPage)) {
            savedShapeAwaitingRender = null;
            savedWithoutPageRender = null;
          }
          savedOfPage = savedRenderOfPage;
          held = nextHeld;
          nameSavedShape(saved.shape);
          unsavedRender.committed(shownSnapshot, saved.shape);
        },
        node: inPlaceOfSaved(shownSnapshot, saved, nextHeld),
      };
    },
    snapshot: () => snapshot,
    stop() {
      unsavedRender.stop();
      stopListening();
      stopListeningToSaves();
      unnameSavedShape?.();
    },
  };
}
