import type { ReactNode } from "react";

import { startTransition, useContext, useRef, useState } from "react";

import type { LiveRichTextRequest } from "../../shared/protocol.js";
import type { LiveRichTextIdentity } from "../instantPreview/liveRichTextOf.js";
import type { LiveRichText } from "../instantPreview/unsavedRender/liveRichText.js";
import type {
  RenderedOnThePage,
  RichTextRenders,
} from "../instantPreview/unsavedRender/renderSources.js";
import type {
  RenderOfShape,
  UnsavedRenderState,
} from "../instantPreview/unsavedRender/unsavedRender.js";

import { OverlayScopeContext } from "./overlayContext.js";
import { startLiveRichText } from "../overlayScope.js";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect.js";
import { useRenderSources, useVisualEditing } from "./VisualEditingProvider.js";
import { shownWithoutLiveRichText } from "../instantPreview/unsavedRender/liveRichText.js";
import { NOTHING_TOLD } from "../instantPreview/unsavedRender/unsavedRender.js";

export type LiveRichTextRender = (
  request: LiveRichTextRequest,
  signal: AbortSignal
) => Promise<ReactNode>;

export type LiveRichTextAction = (request: LiveRichTextRequest) => Promise<ReactNode>;

export type LiveRichTextRenderValue<Value = unknown> = (value: Value) => ReactNode;

export type UnsavedRenders = {
  render: LiveRichTextRender;
  renderValue?: LiveRichTextRenderValue;
};

export type UnsavedRenderOfField = {
  dropUnsavedRender: () => void;
  shown: ReactNode;
};

export function useUnsavedRender(
  identity: LiveRichTextIdentity,
  saved: RenderOfShape<ReactNode>,
  { render, renderValue }: UnsavedRenders
): UnsavedRenderOfField {
  const { adminOrigin, isInstantPreviewOn: isLive } = useVisualEditing();
  const sources = useRenderSources();
  const scope = useContext(OverlayScopeContext);
  const isRenderedOnThePage = renderValue !== undefined;
  const [state, setState] = useState<UnsavedRenderState<ReactNode>>(NOTHING_TOLD);
  const live = useRef<LiveRichText<ReactNode> | null>(null);
  const onThePage = useRef<RenderedOnThePage<ReactNode> | null>(null);
  const latest = useRef({
    adminOrigin,
    identity,
    render,
    renderValue,
    savedShape: saved.shape,
    sources,
    state,
  });

  useIsomorphicLayoutEffect(() => {
    latest.current = {
      adminOrigin,
      identity,
      render,
      renderValue,
      savedShape: saved.shape,
      sources,
      state,
    };
  });

  const liveRichText = isLive ? live.current : null;
  const shownNow = liveRichText
    ? liveRichText.shownFor(state, saved)
    : shownWithoutLiveRichText(saved);

  useIsomorphicLayoutEffect(() => {
    shownNow.commit();
  });

  const rendersNow = (): RichTextRenders<ReactNode> => ({
    render: latest.current.render,
    renderValue: latest.current.renderValue && ((value) => latest.current.renderValue?.(value)),
  });

  useIsomorphicLayoutEffect(() => {
    if (!isLive || !isRenderedOnThePage) return;
    const rendered = sources.onThePage(latest.current.identity, rendersNow(), () =>
      live.current?.renderOnThePageAgain()
    );
    onThePage.current = rendered;
    return () => {
      onThePage.current = null;
      rendered?.stop();
    };
  }, [isLive, isRenderedOnThePage, sources, identity.hasReferences]);

  useIsomorphicLayoutEffect(() => {
    if (!isLive) return;
    const created = startLiveRichText<ReactNode>(scope, {
      adminOrigin: () => latest.current.adminOrigin,
      field: latest.current.identity.field,
      onChange: (nextState, isRender) => {
        const show = () => setState(nextState);
        if (isRender) startTransition(show);
        else show();
      },
      optimistic: (request) => onThePage.current?.optimistic(request) ?? null,
      render: (request, signal) => latest.current.sources.render(rendersNow(), request, signal),
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
