import type { ReactNode } from "react";

import { startTransition, useContext, useRef, useState } from "react";

import type { LiveRichTextField, LiveRichTextRequest } from "../../../shared/protocol.js";
import type { LiveRichText } from "./liveRichText.js";
import type { RenderOfShape, UnsavedRenderState } from "./unsavedRender.js";

import { OverlayScopeContext } from "../../overlayContext.js";
import { startLiveRichText } from "../../overlayScope.js";
import { useIsomorphicLayoutEffect } from "../../useIsomorphicLayoutEffect.js";
import { useVisualEditing } from "../../VisualEditingProvider.js";
import { shownWithoutLiveRichText } from "./liveRichText.js";
import { NOTHING_TOLD } from "./unsavedRender.js";

export type LiveRichTextRender = (
  request: LiveRichTextRequest,
  signal: AbortSignal
) => Promise<ReactNode>;

export type LiveRichTextAction = (request: LiveRichTextRequest) => Promise<ReactNode>;

export type UnsavedRenderOfField = {
  dropUnsavedRender: () => void;
  shown: ReactNode;
};

export function useUnsavedRender(
  field: LiveRichTextField,
  saved: RenderOfShape<ReactNode>,
  render: LiveRichTextRender
): UnsavedRenderOfField {
  const { adminOrigin, available, instantPreview } = useVisualEditing();
  const scope = useContext(OverlayScopeContext);
  const isLive = available && instantPreview;
  const [state, setState] = useState<UnsavedRenderState<ReactNode>>(NOTHING_TOLD);
  const live = useRef<LiveRichText<ReactNode> | null>(null);
  const latest = useRef({ adminOrigin, field, render, savedShape: saved.shape, state });

  useIsomorphicLayoutEffect(() => {
    latest.current = { adminOrigin, field, render, savedShape: saved.shape, state };
  });

  const liveRichText = isLive ? live.current : null;
  const shownNow = liveRichText
    ? liveRichText.shownFor(state, saved)
    : shownWithoutLiveRichText(saved);

  useIsomorphicLayoutEffect(() => {
    shownNow.commit();
  });

  useIsomorphicLayoutEffect(() => {
    if (!isLive) return;
    const created = startLiveRichText<ReactNode>(scope, {
      adminOrigin: () => latest.current.adminOrigin,
      field: latest.current.field,
      onChange: (nextState, isRender) => {
        const show = () => setState(nextState);
        if (isRender) startTransition(show);
        else show();
      },
      render: (request, signal) => latest.current.render(request, signal),
      savedShape: latest.current.savedShape,
      shown: latest.current.state,
    });
    live.current = created;

    return () => {
      live.current = null;
      created.stop();
    };
  }, [isLive, scope]);

  return {
    dropUnsavedRender: () => live.current?.dropUnsaved(),
    shown: shownNow.node,
  };
}
