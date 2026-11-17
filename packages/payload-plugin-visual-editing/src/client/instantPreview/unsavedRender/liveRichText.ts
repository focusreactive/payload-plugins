import type { LiveRichTextField, LiveRichTextRequest } from "../../../shared/protocol.js";
import type { AdminPage } from "../adminChannel.js";
import type { SavedRichTextShapes } from "./savedShapes.js";
import type { RenderOfShape, UnsavedRenderState } from "./unsavedRender.js";

import { keyedFieldAddressOf, veDocumentOf } from "../../../shared/veDocument.js";
import { listenToAdmin } from "../adminChannel.js";
import { readRichTextStructure } from "../liveMessages.js";
import { announceLiveRichText } from "./announcer.js";
import { createUnsavedRender, heldSavedOf, inPlaceOfSaved, NOTHING_TOLD } from "./unsavedRender.js";

export type RenderUnsavedRichText<Node> = (
  request: LiveRichTextRequest,
  signal: AbortSignal
) => Promise<Node | null | undefined>;

export type LiveRichTextOptions<Node> = {
  field: LiveRichTextField;
  savedShape: string;
  shown?: UnsavedRenderState<Node>;
  adminPage: () => AdminPage;
  savedShapes: SavedRichTextShapes | null;
  render: RenderUnsavedRichText<Node>;
  onChange: (snapshot: UnsavedRenderState<Node>, isRender: boolean) => void;
};

export type ShownRichText<Node> = { node: Node; commit: () => void };

export interface LiveRichText<Node> {
  snapshot(): UnsavedRenderState<Node>;
  shownFor(snapshot: UnsavedRenderState<Node>, saved: RenderOfShape<Node>): ShownRichText<Node>;
  dropUnsaved(): void;
  stop(): void;
}

const commitNothing = (): void => undefined;

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
  render,
  savedShape,
  savedShapes,
  shown = NOTHING_TOLD,
}: LiveRichTextOptions<Node>): LiveRichText<Node> {
  const fieldAddress = keyedFieldAddressOf(field);
  let snapshot = shown;
  let held: RenderOfShape<Node> | null = null;
  let namedShape = savedShape;
  let unnameSavedShape = savedShapes?.name(fieldAddress, savedShape);

  const nameSavedShape = (shape: string) => {
    if (shape === namedShape) return;
    unnameSavedShape?.();
    namedShape = shape;
    unnameSavedShape = savedShapes?.name(fieldAddress, shape);
  };

  const unsavedRender = createUnsavedRender<Node>({
    onChange: (change, isRender) => {
      snapshot = { ...snapshot, ...change };
      onChange(snapshot, isRender);
    },
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

  return {
    dropUnsaved: unsavedRender.dropUnsaved,
    shownFor(shownSnapshot, saved) {
      const nextHeld = heldSavedOf(held ?? saved, saved, shownSnapshot.editorShape);
      return {
        commit() {
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
      unnameSavedShape?.();
    },
  };
}
