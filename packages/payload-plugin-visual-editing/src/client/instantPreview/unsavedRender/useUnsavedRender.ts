import type { ReactNode } from "react";

import { startTransition, useContext, useEffect, useRef, useState } from "react";

import type { LiveRichTextField, LiveRichTextRequest } from "../../../shared/protocol.js";
import type { RenderOfShape, UnsavedRender, UnsavedRenderState } from "./unsavedRender.js";

import { keyedFieldAddressOf, veDocumentOf } from "../../../shared/veDocument.js";
import { listenToAdmin } from "../adminChannel.js";
import { adminOriginOf } from "../../adminWindow.js";
import { readRichTextStructure } from "../liveMessages.js";
import { OverlayLocaleContext, SavedRichTextShapesContext } from "../../overlayContext.js";
import { useIsomorphicLayoutEffect } from "../../useIsomorphicLayoutEffect.js";
import { useVisualEditing } from "../../VisualEditingProvider.js";
import { announceLiveRichText } from "./announcer.js";
import { createUnsavedRender, heldSavedOf, inPlaceOfSaved, NOTHING_TOLD } from "./unsavedRender.js";

export type LiveRichTextRender = (
  request: LiveRichTextRequest,
  signal: AbortSignal
) => Promise<ReactNode>;

export type LiveRichTextAction = (request: LiveRichTextRequest) => Promise<ReactNode>;

export type UnsavedRenderOfField = {
  dropUnsavedRender: () => void;
  shown: ReactNode;
};

type Shown = { renderKey: string; state: UnsavedRenderState<ReactNode> };

export function useUnsavedRender(
  field: LiveRichTextField,
  saved: RenderOfShape<ReactNode>,
  render: LiveRichTextRender
): UnsavedRenderOfField {
  const { adminOrigin, available, instantPreview } = useVisualEditing();
  const pageLocale = useContext(OverlayLocaleContext);
  const savedShapes = useContext(SavedRichTextShapesContext);
  const fieldAddress = keyedFieldAddressOf(field);
  const renderKey = JSON.stringify([fieldAddress, pageLocale ?? null]);
  const savedShape = saved.shape;
  const isLive = available && instantPreview;
  const [shown, setShown] = useState<Shown>({ renderKey, state: NOTHING_TOLD });
  const [heldSaved, setHeldSaved] = useState(saved);
  const unsavedRender = useRef<UnsavedRender<ReactNode> | null>(null);
  const shownOfThisField = shown.renderKey === renderKey ? shown.state : NOTHING_TOLD;
  const latest = useRef({ adminOrigin, field, pageLocale, render, savedShape, shownOfThisField });

  useIsomorphicLayoutEffect(() => {
    latest.current = { adminOrigin, field, pageLocale, render, savedShape, shownOfThisField };
    unsavedRender.current?.committed(shownOfThisField, savedShape);
  });

  useIsomorphicLayoutEffect(() => {
    if (isLive) return savedShapes?.name(fieldAddress, savedShape);
  }, [fieldAddress, isLive, savedShape, savedShapes]);

  useEffect(() => {
    if (!isLive) return;
    const fieldRender = createUnsavedRender<ReactNode>({
      onChange: (change, isRender) => {
        const show = () =>
          setShown((current) => ({
            renderKey,
            state: {
              ...(current.renderKey === renderKey ? current.state : NOTHING_TOLD),
              ...change,
            },
          }));
        if (isRender) startTransition(show);
        else show();
      },
      render: ({ locale, state }, signal) =>
        latest.current.render({ field: latest.current.field, locale, state }, signal),
      savedShape: latest.current.savedShape,
      shown: latest.current.shownOfThisField,
    });
    unsavedRender.current = fieldRender;

    const adminPage = () => ({
      adminOrigin: adminOriginOf(latest.current.adminOrigin),
      locale: latest.current.pageLocale,
    });

    const stopListening = listenToAdmin({
      adminPage,
      announce: () => {
        const announced = latest.current.field;
        announceLiveRichText(
          { document: veDocumentOf(announced), key: announced.key },
          adminPage()
        );
      },
      onMessage: fieldRender.tell,
      read: (data: unknown) => {
        const structure = readRichTextStructure(data);
        const isOfThisField = structure && keyedFieldAddressOf(structure) === fieldAddress;
        return isOfThisField ? structure : null;
      },
    });

    return () => {
      unsavedRender.current = null;
      fieldRender.stop();
      stopListening();
    };
  }, [fieldAddress, isLive, renderKey]);

  const shownState = isLive ? shownOfThisField : NOTHING_TOLD;
  const held = heldSavedOf(heldSaved, saved, shownState.editorShape);
  if (held !== heldSaved) setHeldSaved(held);

  return {
    dropUnsavedRender: () => unsavedRender.current?.dropUnsaved(),
    shown: inPlaceOfSaved(shownState, saved, held),
  };
}
